import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { registerUploadRoutes } from "./uploads";
import { wavespeedService } from "./wavespeed";
import path from "path";
import fs from "fs";

const generateVideoSchema = z.object({
  imagePath: z.string().min(1, "Caminho da imagem é obrigatório"),
});

const ADMIN_EMAIL = "felipe.ribbe@gmail.com";

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
  
  registerUploadRoutes(app);

  // Helper function to serve video files with range support
  const serveVideo = (videoPath: string, req: Request, res: Response) => {
    if (!fs.existsSync(videoPath)) {
      console.error("Video not found at:", videoPath);
      return res.status(404).json({ message: "Video not found" });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=86400",
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  };

  // Video de fundo da landing page
  app.get("/api/background-video", async (req, res) => {
    try {
      const videoPath = path.join(process.cwd(), "Videos", "vídeo fundo tela inicial.mp4");
      serveVideo(videoPath, req, res);
    } catch (error) {
      console.error("Error serving background video:", error);
      res.status(500).json({ message: "Error serving video" });
    }
  });

  // Video de referencia para geracao de IA
  app.get("/api/reference-video", async (req, res) => {
    try {
      const videoPath = path.join(process.cwd(), "Videos", "vídeo referencia.mp4");
      serveVideo(videoPath, req, res);
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

      // IP blocking is the main protection against abuse (email verification optional)
      const canGenerate = !hasVideo && !ipAlreadyUsed;
      
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

      // Email verification is optional - IP blocking is the main protection
      // if (!user.emailVerified) {
      //   return res.status(403).json({ 
      //     message: "Por favor, verifique seu email antes de gerar vídeos.",
      //     emailNotVerified: true
      //   });
      // }

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

  // Reset user - delete their videos so they can generate again
  app.delete("/api/admin/reset-user/:userId", isAuthenticated, isAdminMiddleware, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Delete all videos for this user
      const deletedCount = await storage.deleteVideosByUserId(userId);
      
      res.json({ 
        success: true, 
        message: `Usuário resetado. ${deletedCount} vídeo(s) deletado(s).`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error resetting user:", error);
      res.status(500).json({ message: "Erro ao resetar usuário" });
    }
  });

  // Delete video by ID
  app.delete("/api/admin/videos/:videoId", isAuthenticated, isAdminMiddleware, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      
      await storage.deleteVideo(videoId);
      
      res.json({ 
        success: true, 
        message: "Vídeo deletado com sucesso" 
      });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Erro ao deletar vídeo" });
    }
  });

  return httpServer;
}
