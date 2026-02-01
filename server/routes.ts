import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { wavespeedService } from "./wavespeed";
import { sendPaymentNotification } from "./email";

const generateVideoSchema = z.object({
  imagePath: z.string().min(1, "Caminho da imagem é obrigatório"),
});

const PIX_KEY = "21995571985";
const PIX_AMOUNT = "5.00";
const PIX_NAME = "JOGADINHA PAQUETA";
const PIX_CITY = "Rio de Janeiro";
const ADMIN_EMAIL = "felipe.vasconcellos@ab-inbev.com";

function generatePixCode(key: string, amount: string, name: string, city: string): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const merchantAccountInfo = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', key);
  
  let payload = '';
  payload += formatField('00', '01');
  payload += formatField('26', merchantAccountInfo);
  payload += formatField('52', '0000');
  payload += formatField('53', '986');
  payload += formatField('54', amount);
  payload += formatField('58', 'BR');
  payload += formatField('59', name.substring(0, 25));
  payload += formatField('60', city.substring(0, 15));
  payload += formatField('62', formatField('05', '***'));

  payload += '6304';

  const crc16 = (str: string): string => {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  };

  return payload + crc16(payload);
}

const isAdmin = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  const userId = req.user.claims.sub;
  let user = await storage.getUser(userId);
  
  // Fallback: if user not found by ID, try by email (handles OIDC ID mismatch)
  if (!user && req.user.claims.email) {
    user = await storage.getUserByEmail(req.user.claims.email);
  }
  
  if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  app.post("/api/videos/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (user.credits <= 0) {
        return res.status(402).json({ 
          message: "Créditos insuficientes",
          needsPayment: true,
          credits: user.credits 
        });
      }

      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() 
        || req.socket?.remoteAddress 
        || "unknown";

      const userVideos = await storage.getVideosByUserId(userId);
      const userPayments = await storage.getPaymentRequestsByUserId(userId);
      const hasApprovedPayment = userPayments.some(p => p.status === "approved");
      
      const isUsingFreeCredit = userVideos.length === 0 && user.credits === 1 && !hasApprovedPayment;

      if (isUsingFreeCredit && clientIp !== "unknown") {
        const existingUsage = await storage.checkIpUsedFreeVideo(clientIp, 30);
        
        if (existingUsage) {
          return res.status(403).json({
            message: "Este dispositivo já foi usado para gerar um vídeo grátis recentemente. Faça um pagamento para continuar.",
            ipBlocked: true,
            needsPayment: true
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

      await storage.deductUserCredit(userId);

      const video = await storage.createVideo({
        userId,
        sourceImagePath: imagePath,
        status: "pending",
      });

      res.json(video);

      const shouldRecordIp = isUsingFreeCredit && clientIp !== "unknown";

      setImmediate(async () => {
        try {
          await storage.updateVideo(video.id, { status: "processing" });

          const requestId = await wavespeedService.submitVideoGeneration(imagePath);

          await storage.updateVideo(video.id, {
            wavespeedRequestId: requestId,
            status: "processing",
          });

          if (shouldRecordIp) {
            await storage.recordFreeVideoUsage(userId, clientIp);
            console.log(`Recorded free video usage for IP ${clientIp}`);
          }

        } catch (error) {
          console.error("Error submitting video generation:", error);
          await storage.addUserCredit(userId);
          console.log(`Refunded 1 credit to user ${userId} due to video generation failure`);
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

  app.get("/api/user/credits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ credits: user?.credits || 0 });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Erro ao buscar créditos" });
    }
  });

  app.get("/api/pix-info", isAuthenticated, async (req: any, res) => {
    const pixCode = generatePixCode(PIX_KEY, PIX_AMOUNT, PIX_NAME, PIX_CITY);
    res.json({
      pixKey: PIX_KEY,
      amount: PIX_AMOUNT,
      description: "Jogadinha do Paquetá - 1 vídeo",
      pixCode,
    });
  });

  app.post("/api/payment-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const existingPending = await storage.getPaymentRequestsByUserId(userId);
      const hasPending = existingPending.some(p => p.status === "pending");
      
      if (hasPending) {
        return res.status(400).json({ 
          message: "Você já tem um pagamento pendente de aprovação" 
        });
      }

      const request = await storage.createPaymentRequest({
        userId,
        amount: PIX_AMOUNT,
        status: "pending",
      });

      const user = await storage.getUser(userId);
      if (user && request.approvalToken) {
        sendPaymentNotification({
          paymentRequestId: request.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuário',
          userEmail: user.email || 'N/A',
          amount: PIX_AMOUNT,
          approvalToken: request.approvalToken,
        }).catch(err => console.error("Failed to send payment notification:", err));
      }

      res.json(request);
    } catch (error) {
      console.error("Error creating payment request:", error);
      res.status(500).json({ message: "Erro ao criar solicitação de pagamento" });
    }
  });

  app.get("/api/payment-requests/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getPaymentRequestsByUserId(userId);
      const pending = requests.find(p => p.status === "pending");
      res.json({ hasPending: !!pending, pending });
    } catch (error) {
      console.error("Error checking pending payments:", error);
      res.status(500).json({ message: "Erro ao verificar pagamentos" });
    }
  });

  app.get("/api/admin/payment-requests", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const requests = await storage.getPendingPaymentRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching admin payment requests:", error);
      res.status(500).json({ message: "Erro ao buscar solicitações" });
    }
  });

  app.post("/api/admin/payment-requests/:id/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { id } = req.params;
      
      const updated = await storage.approvePaymentRequest(id, adminId);
      
      if (!updated) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error approving payment:", error);
      res.status(500).json({ message: "Erro ao aprovar pagamento" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.get("/api/admin/quick-approve/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const paymentRequest = await storage.getPaymentRequestByToken(token);
      
      if (!paymentRequest) {
        return res.status(404).send(`
          <html>
            <head><meta charset="utf-8"><title>Erro</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: white;">
              <h1>❌ Link inválido</h1>
              <p>Esta solicitação de pagamento não foi encontrada.</p>
            </body>
          </html>
        `);
      }

      if (paymentRequest.status !== "pending") {
        return res.status(400).send(`
          <html>
            <head><meta charset="utf-8"><title>Já aprovado</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: white;">
              <h1>✓ Já aprovado</h1>
              <p>Este pagamento já foi aprovado anteriormente.</p>
            </body>
          </html>
        `);
      }

      await storage.approvePaymentRequest(paymentRequest.id, "email-approval");

      const userName = paymentRequest.user 
        ? `${paymentRequest.user.firstName || ''} ${paymentRequest.user.lastName || ''}`.trim()
        : 'Usuário';

      res.send(`
        <html>
          <head>
            <meta charset="utf-8">
            <title>Pagamento Aprovado</title>
            <style>
              body {
                font-family: 'Inter', -apple-system, sans-serif;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .card {
                background: #111;
                border-radius: 16px;
                padding: 48px;
                text-align: center;
                border: 1px solid #333;
                max-width: 400px;
              }
              .success-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                font-size: 40px;
              }
              h1 { 
                color: #22c55e; 
                margin: 0 0 16px; 
                font-size: 24px;
              }
              p { 
                color: #888; 
                margin: 0 0 8px;
                font-size: 16px;
              }
              .user-name {
                color: white;
                font-weight: 600;
                font-size: 18px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="success-icon">✓</div>
              <h1>Pagamento Aprovado!</h1>
              <p>Crédito adicionado para:</p>
              <p class="user-name">${userName}</p>
              <p style="margin-top: 24px; font-size: 14px;">Pode fechar esta janela.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error in quick approve:", error);
      res.status(500).send(`
        <html>
          <head><meta charset="utf-8"><title>Erro</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: white;">
            <h1>❌ Erro</h1>
            <p>Ocorreu um erro ao aprovar o pagamento. Tente novamente.</p>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/admin/users/:id/credits", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { credits } = req.body;
      
      if (typeof credits !== "number" || credits < 0) {
        return res.status(400).json({ message: "Créditos inválidos" });
      }

      const updated = await storage.updateUserCredits(id, credits);
      
      if (!updated) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating credits:", error);
      res.status(500).json({ message: "Erro ao atualizar créditos" });
    }
  });

  return httpServer;
}
