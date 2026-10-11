import multer, { type FileFilterCallback } from "multer";
import path from "node:path";
import type { Request } from "express";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error(`Invalid file extension: '${ext}'. Only .pdf, .doc, and .docx are allowed.`));
    return;
  }

  // Some browsers or OS environments might report octet-stream for word docs, so verify extension or mime
  if (!ALLOWED_MIME_TYPES.has(mime) && mime !== "application/octet-stream") {
    cb(new Error(`Invalid file type: '${mime}'. Only PDF or Word documents are allowed.`));
    return;
  }

  cb(null, true);
}

export const resumeUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});
