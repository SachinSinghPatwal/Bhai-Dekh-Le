import fs from 'fs';
import path from 'path';
import logger from '../../utility/logger.js';
import { ResumeData } from '../../types/automation.types.js';

/**
 * Handles resume upload, storage, and parsing
 */
export class ResumeService {
  private uploadPath: string;

  constructor() {
    this.uploadPath = process.env.RESUME_UPLOAD_PATH || './uploads/resumes';
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      logger.info('Created resume upload directory', { path: this.uploadPath });
    }
  }

  /**
   * Save uploaded resume file
   */
  async saveResume(
    userId: string,
    file: Express.Multer.File
  ): Promise<ResumeData> {
    try {
      // Validate file
      this.validateFile(file);

      // Create user-specific directory
      const userDir = path.join(this.uploadPath, userId);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // Generate unique filename
      const ext = path.extname(file.originalname);
      const fileName = `resume${ext}`;
      const filePath = path.join(userDir, fileName);

      // Save file
      fs.writeFileSync(filePath, file.buffer);

      logger.info('Resume saved', { userId, fileName });

      return {
        path: filePath,
        fileName: file.originalname,
        text: '', // Will be extracted when needed
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to save resume', { error, userId });
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    // Kept in sync with the multer fileFilter on the upload route and with the
    // formats the text extractor can actually read.
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only PDF, DOCX and TXT files are allowed.');
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }
  }

  /**
   * Delete resume file
   */
  async deleteResume(userId: string): Promise<void> {
    try {
      const userDir = path.join(this.uploadPath, userId);
      if (fs.existsSync(userDir)) {
        fs.rmSync(userDir, { recursive: true, force: true });
        logger.info('Resume deleted', { userId });
      }
    } catch (error) {
      logger.error('Failed to delete resume', { error, userId });
      throw error;
    }
  }

  /**
   * Check if resume exists for user
   */
  hasResume(userId: string): boolean {
    const userDir = path.join(this.uploadPath, userId);
    return fs.existsSync(userDir);
  }

  /**
   * Get resume path for user
   */
  getResumePath(userId: string): string | null {
    const userDir = path.join(this.uploadPath, userId);
    if (!fs.existsSync(userDir)) {
      return null;
    }

    const files = fs.readdirSync(userDir);
    const resumeFile = files.find((f) => f.startsWith('resume'));

    return resumeFile ? path.join(userDir, resumeFile) : null;
  }
}
