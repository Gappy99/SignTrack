import multer from "multer";
import crypto from "crypto";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "uploads");
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/avif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    const baseName = file.originalname.replace(ext, "");
    const safeBase = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
    cb(null, `${safeBase}-${id}${ext}`);
  },
});

export const uploadFieldImage = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Solo se permiten imágenes: ${MIMETYPES.join(", ")}`));
    }
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});
