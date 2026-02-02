import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { wavespeedService } from "./wavespeed";

const generateVideoSchema = z.object({
  imagePath: z.string().min(1, "Caminho da imagem é obrigatório"),
});

const ADMIN_EMAIL = "felipe.vasconcellos@ab-inbev.com";

const isAdminMiddleware = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Acesso negado - Admin only" });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  
  registerObjectStorageRoutes(app);

  const objectStorageService = new ObjectStorageService();

  app.get("/api/reference-video", async (req, res) => {
    try {
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        return res.status(500).json({ message: "Storage not configured" });
      }

      const { objectStorageClient } = await import("./replit_integrations/object_storage/objectStorage");
      const bucket = objectStorageClient.bucket(bucketId);
      const file = bucket.file("public/reference-dance.mp4");

      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ message: "Reference video not found" });
      }

      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": "video/mp4",
        "Content-Length": metadata.size,
        "Cache-Control": "public, max-age=86400",
      });

      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming video" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error serving reference video:", error);
      res.status(500).json({ message: "Error serving video" });
    }
  });

  app.get("/api/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const videos = await storage.getVideosByUserId(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Erro ao buscar vídeos" });
    }
  });

  app.get("/api/videos/public/:id", async (req, res) => {
    try {
      const video = await storage.getVideoById(req.params.id);
      
      if (!video) {
        return res.status(404).json({ message: "Vídeo não encontrado" });
      }

      if (video.status !== "completed") {
        return res.status(403).json({ message: "Vídeo ainda não está disponível" });
      }

      res.json({
        id: video.id,
        generatedVideoUrl: video.generatedVideoUrl,
        status: video.status,
        createdAt: video.createdAt,
      });
    } catch (error) {
      console.error("Error fetching public video:", error);
      res.status(500).json({ message: "Erro ao buscar vídeo" });
    }
  });

  app.get("/api/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const video = await storage.getVideoById(req.params.id);
      
      if (!video) {
        return res.status(404).json({ message: "Vídeo não encontrado" });
      }

      if (video.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      if ((video.status === "pending" || video.status === "processing") && video.wavespeedRequestId) {
        try {
          const result = await wavespeedService.checkVideoStatus(video.wavespeedRequestId);
          
          if (result.status !== video.status) {
            const updatedVideo = await storage.updateVideo(video.id, {
              status: result.status,
              generatedVideoUrl: result.videoUrl || null,
              errorMessage: result.error || null,
            });
            return res.json(updatedVideo);
          }
        } catch (checkError) {
          console.error("Error checking video status:", checkError);
        }
      }

      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Erro ao buscar vídeo" });
    }
  });

  app.get("/api/user/can-generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const videos = await storage.getVideosByUserId(userId);
      
      const hasVideo = videos.length > 0;
      const hasCompletedVideo = videos.some(v => v.status === "completed");
      const hasPendingVideo = videos.some(v => v.status === "pending" || v.status === "processing");
      const emailVerified = user?.emailVerified || false;

      // Check IP
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
        || req.socket?.remoteAddress 
        || 'unknown';
      
      let ipAlreadyUsed = false;
      if (clientIp !== 'unknown') {
        const existingVideoByIp = await storage.getVideoByIpAddress(clientIp);
        ipAlreadyUsed = !!existingVideoByIp;
      }

      const canGenerate = !hasVideo && emailVerified && !ipAlreadyUsed;
      
      res.json({ 
        canGenerate,
        hasVideo,
        hasCompletedVideo,
        hasPendingVideo,
        videoCount: videos.length,
        emailVerified,
        ipAlreadyUsed,
      });
    } catch (error) {
      console.error("Error checking generation eligibility:", error);
      res.status(500).json({ message: "Erro ao verificar elegibilidade" });
    }
  });

  app.post("/api/videos/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Por favor, verifique seu email antes de gerar vídeos.",
          emailNotVerified: true
        });
      }

      // Check if user already has a video
      const existingVideos = await storage.getVideosByUserId(userId);
      if (existingVideos.length > 0) {
        return res.status(403).json({ 
          message: "Você já gerou seu vídeo. Cada usuário pode gerar apenas um vídeo.",
          alreadyGenerated: true
        });
      }

      // Get client IP address
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
        || req.socket?.remoteAddress 
        || 'unknown';

      // Check if this IP already generated a video
      if (clientIp !== 'unknown') {
        const existingVideoByIp = await storage.getVideoByIpAddress(clientIp);
        if (existingVideoByIp) {
          return res.status(403).json({ 
            message: "Este dispositivo já foi usado para gerar um vídeo. Cada dispositivo pode gerar apenas um vídeo.",
            ipAlreadyUsed: true
          });
        }
      }
      
      const parseResult = generateVideoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: parseResult.error.errors[0]?.message || "Dados inválidos" 
        });
      }
      
      const { imagePath } = parseResult.data;

      const video = await storage.createVideo({
        userId,
        sourceImagePath: imagePath,
        status: "pending",
        ipAddress: clientIp !== 'unknown' ? clientIp : null,
      });

      res.json(video);

      setImmediate(async () => {
        try {
          await storage.updateVideo(video.id, { status: "processing" });

          const requestId = await wavespeedService.submitVideoGeneration(imagePath);

          await storage.updateVideo(video.id, {
            wavespeedRequestId: requestId,
            status: "processing",
          });

        } catch (error) {
          console.error("Error submitting video generation:", error);
          await storage.updateVideo(video.id, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
          });
        }
      });

    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Erro ao criar vídeo" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdminMiddleware, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.get("/api/admin/videos", isAuthenticated, isAdminMiddleware, async (req: any, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Erro ao buscar vídeos" });
    }
  });

  return httpServer;
}
