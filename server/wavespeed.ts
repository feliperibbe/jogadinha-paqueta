const WAVESPEED_API_URL = "https://api.wavespeed.ai/api/v3";
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

interface WavespeedSubmitResponse {
  code: number;
  message: string;
  data: {
    id: string;
    model: string;
    status: string;
    outputs: string[];
    urls: {
      get: string;
    };
    error?: string;
  };
}

interface WavespeedResultResponse {
  code: number;
  message: string;
  data: {
    id: string;
    status: string;
    outputs: string[];
    error?: string;
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method: "GET",
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to sign object URL: ${response.status}`);
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

export class WavespeedService {
  private apiKey: string;
  private bucketId: string;

  constructor() {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      throw new Error("WAVESPEED_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID environment variable is required");
    }
    this.bucketId = bucketId;
    console.log("WaveSpeed service initialized");
  }

  private async getReferenceVideoUrl(): Promise<string> {
    return signObjectURL({
      bucketName: this.bucketId,
      objectName: "public/reference-dance.mp4",
      ttlSec: 3600,
    });
  }

  async getSignedImageUrl(imagePath: string): Promise<string> {
    // imagePath comes as /objects/uploads/uuid
    // PRIVATE_OBJECT_DIR is like /bucket-name/.private
    // We need to extract just the .private part for the object name
    const privateDir = process.env.PRIVATE_OBJECT_DIR || ".private";
    
    // Remove leading slash and bucket name if present
    let objectPrefix = privateDir;
    if (objectPrefix.startsWith("/")) {
      objectPrefix = objectPrefix.slice(1);
    }
    // If it starts with the bucket ID, remove it
    if (objectPrefix.startsWith(this.bucketId)) {
      objectPrefix = objectPrefix.slice(this.bucketId.length);
      if (objectPrefix.startsWith("/")) {
        objectPrefix = objectPrefix.slice(1);
      }
    }
    
    const relativePath = imagePath.replace("/objects/", "");
    const objectName = `${objectPrefix}/${relativePath}`;
    
    console.log(`Signing image URL for object: ${objectName}`);
    
    return signObjectURL({
      bucketName: this.bucketId,
      objectName,
      ttlSec: 3600,
    });
  }

  async submitVideoGeneration(imagePath: string): Promise<string> {
    console.log(`Starting video generation for imagePath: ${imagePath}`);
    
    const referenceVideoUrl = await this.getReferenceVideoUrl();
    console.log(`Reference video URL: ${referenceVideoUrl.substring(0, 100)}...`);
    
    const signedImageUrl = await this.getSignedImageUrl(imagePath);
    console.log(`Signed image URL: ${signedImageUrl.substring(0, 100)}...`);
    
    const requestBody = {
      image: signedImageUrl,
      video: referenceVideoUrl,
      character_orientation: "image",
      keep_original_sound: true,
    };
    console.log(`Request body keys: ${Object.keys(requestBody).join(', ')}`);
    
    const response = await fetch(
      `${WAVESPEED_API_URL}/kwaivgi/kling-v2.6-pro/motion-control`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WaveSpeed API error:", errorText);
      throw new Error(`WaveSpeed API error: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("WaveSpeed API response:", responseText);
    
    const result: WavespeedSubmitResponse = JSON.parse(responseText);
    console.log("Parsed response - code:", result.code, "message:", result.message);
    
    if (result.code !== 200 || !result.data?.id) {
      console.error("Full response data:", JSON.stringify(result, null, 2));
      throw new Error(result.data?.error || result.message || "No request ID returned from WaveSpeed");
    }

    console.log("Got request ID:", result.data.id);
    return result.data.id;
  }

  async checkVideoStatus(requestId: string): Promise<{
    status: "pending" | "processing" | "completed" | "failed";
    videoUrl?: string;
    error?: string;
  }> {
    const response = await fetch(
      `${WAVESPEED_API_URL}/predictions/${requestId}/result`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WaveSpeed status check error:", errorText);
      return { status: "failed", error: `API error: ${response.status}` };
    }

    const result: WavespeedResultResponse = await response.json();
    const data = result.data;
    
    console.log("Status check response - status:", data.status, "outputs:", data.outputs?.length || 0);

    switch (data.status) {
      case "completed":
      case "succeeded":
        if (data.outputs && data.outputs.length > 0) {
          return { status: "completed", videoUrl: data.outputs[0] };
        }
        return { status: "failed", error: "No video URL in response" };
      
      case "failed":
      case "error":
        return { status: "failed", error: data.error || "Generation failed" };
      
      case "processing":
      case "running":
      case "created":
        return { status: "processing" };
      
      default:
        return { status: "pending" };
    }
  }
}

export const wavespeedService = new WavespeedService();
