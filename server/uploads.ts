import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo não suportado. Use JPG, PNG ou WebP."));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

export function registerUploadRoutes(app: Express): void {
  // Upload endpoint
  app.post("/api/uploads/image", upload.single("file"), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const objectPath = `/uploads/${req.file.filename}`;
      
      res.json({
        success: true,
        objectPath,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Erro ao fazer upload" });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:filename", (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Arquivo não encontrado" });
      }

      // Determine content type
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      };

      res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=86400");
      
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Erro ao servir arquivo" });
    }
  });
}
