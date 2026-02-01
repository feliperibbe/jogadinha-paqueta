const WAVESPEED_API_URL = "https://api.wavespeed.ai/api/v3";
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

interface WavespeedSubmitResponse {
  id: string;
  status: string;
  urls?: {
    get: string;
  };
}

interface WavespeedResultResponse {
  id: string;
  status: string;
  output?: {
    video_url?: string;
  };
  error?: string;
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

  async submitVideoGeneration(imageUrl: string): Promise<string> {
    const referenceVideoUrl = await this.getReferenceVideoUrl();
    console.log(`Using reference video URL: ${referenceVideoUrl.substring(0, 100)}...`);
    
    const response = await fetch(
      `${WAVESPEED_API_URL}/kwaivgi/kling-v2.6-pro/motion-control`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          image_url: imageUrl,
          video_url: referenceVideoUrl,
          keep_original_sound: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WaveSpeed API error:", errorText);
      throw new Error(`WaveSpeed API error: ${response.status}`);
    }

    const data: WavespeedSubmitResponse = await response.json();
    
    if (!data.id) {
      throw new Error("No request ID returned from WaveSpeed");
    }

    return data.id;
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

    const data: WavespeedResultResponse = await response.json();

    switch (data.status) {
      case "completed":
      case "succeeded":
        if (data.output?.video_url) {
          return { status: "completed", videoUrl: data.output.video_url };
        }
        return { status: "failed", error: "No video URL in response" };
      
      case "failed":
      case "error":
        return { status: "failed", error: data.error || "Generation failed" };
      
      case "processing":
      case "running":
        return { status: "processing" };
      
      default:
        return { status: "pending" };
    }
  }
}

export const wavespeedService = new WavespeedService();
