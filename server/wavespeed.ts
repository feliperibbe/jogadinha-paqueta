const WAVESPEED_API_URL = "https://api.wavespeed.ai/api/v3";

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

export class WavespeedService {
  private apiKey: string;
  private referenceVideoUrl: string;

  constructor() {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      throw new Error("WAVESPEED_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    
    this.referenceVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4";
  }

  async submitVideoGeneration(imageUrl: string): Promise<string> {
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
          video_url: this.referenceVideoUrl,
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
