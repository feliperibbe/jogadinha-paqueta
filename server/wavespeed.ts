const WAVESPEED_API_URL = "https://api.wavespeed.ai/api/v3";

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

export class WavespeedService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      throw new Error("WAVESPEED_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    console.log("WaveSpeed service initialized");
  }

  private getBaseUrl(): string {
    // Use Replit's public domain for external access
    if (process.env.REPLIT_DEV_DOMAIN) {
      return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }
    if (process.env.REPLIT_DOMAINS) {
      const domain = process.env.REPLIT_DOMAINS.split(",")[0];
      if (domain) {
        return `https://${domain}`;
      }
    }
    return "http://localhost:5000";
  }

  private getReferenceVideoUrl(): string {
    // Use our Express server endpoint which proxies the video
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/api/reference-video`;
  }

  getImageUrl(imagePath: string): string {
    // Use our Express server endpoint which proxies the image
    // imagePath is like /objects/uploads/uuid
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}${imagePath}`;
  }

  async submitVideoGeneration(imagePath: string): Promise<string> {
    console.log(`Starting video generation for imagePath: ${imagePath}`);
    
    const referenceVideoUrl = this.getReferenceVideoUrl();
    console.log(`Reference video URL: ${referenceVideoUrl}`);
    
    const imageUrl = this.getImageUrl(imagePath);
    console.log(`Image URL: ${imageUrl}`);
    
    const requestBody = {
      image: imageUrl,
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
