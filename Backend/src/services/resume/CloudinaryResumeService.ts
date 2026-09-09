import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import logger from '../../utility/logger.js';
import { ApiError } from '../../utility/ApiError.js';
import { extractResumeTextFromBuffer } from '../../utility/resume-text.js';

/**
 * True when all three Cloudinary credentials are present.
 *
 * Cloudinary is an optional feature: the rest of the API (auth, scraping,
 * applying) works fine with local resume storage. Callers use this to return a
 * clean 503 instead of letting a missing env var surface as a 500.
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Cloud-based resume storage using Cloudinary
 * Supports compressed file upload and retrieval
 * Saves storage by compressing PDFs and documents
 */
export class CloudinaryResumeService {
  private configured = false;

  /**
   * Configuration is deferred to the first call rather than done in the
   * constructor. Constructing the service must never throw, otherwise a
   * missing CLOUDINARY_* variable stops the entire server from booting.
   */
  private ensureConfigured(): void {
    if (this.configured) return;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ApiError(
        503,
        'Cloud storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Backend/.env, or use local resume upload instead.'
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.configured = true;
    logger.info('Cloudinary configured');
  }

  /**
   * Upload resume to Cloudinary with compression
   * Supports PDF, DOCX, TXT files
   */
  async uploadResume(
    userId: string,
    file: Express.Multer.File,
    isOriginal: boolean = true
  ): Promise<{
    publicUrl: string;
    cloudinaryId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  }> {
    this.ensureConfigured();

    try {
      // Validate file
      this.validateFile(file);

      logger.info('Uploading resume to Cloudinary', {
        userId,
        fileName: file.originalname,
        size: file.size,
      });

      // Determine resource type
      const resourceType = this.getResourceType(file.mimetype);
      const folder = isOriginal ? `resumes/${userId}/original` : `resumes/${userId}/tailored`;

      // Upload with compression and transformations
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder,
            public_id: `resume-${Date.now()}`,
            use_filename: true,
            unique_filename: true,
            quality: 'auto',
            fetch_format: 'auto',
            ...(file.mimetype === 'application/pdf' && {
              flags: 'progressive',
              quality: 85,
            }),
            tags: ['resume', userId, isOriginal ? 'original' : 'tailored'],
            context: {
              userId,
              type: isOriginal ? 'original' : 'tailored',
              uploadedAt: new Date().toISOString(),
            },
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Cloudinary returned no upload result'));
            }
          }
        );

        uploadStream.end(file.buffer);
      });

      logger.info('Resume uploaded to Cloudinary', {
        userId,
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        originalSize: file.size,
        storedSize: uploadResult.bytes,
      });

      return {
        publicUrl: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id,
        fileName: file.originalname,
        fileSize: uploadResult.bytes,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to upload resume to Cloudinary', { error, userId });
      throw error;
    }
  }

  /**
   * Delete resume from Cloudinary
   */
  async deleteResume(cloudinaryId: string): Promise<void> {
    this.ensureConfigured();

    try {
      logger.info('Deleting resume from Cloudinary', { cloudinaryId });

      await cloudinary.uploader.destroy(cloudinaryId, {
        resource_type: 'auto',
      });

      logger.info('Resume deleted from Cloudinary', { cloudinaryId });
    } catch (error) {
      logger.error('Failed to delete resume from Cloudinary', {
        error,
        cloudinaryId,
      });
      throw error;
    }
  }

  /**
   * Get resume from Cloudinary
   */
  async getResumeUrl(cloudinaryId: string): Promise<string> {
    this.ensureConfigured();

    try {
      const resource = await cloudinary.api.resource(cloudinaryId, {
        resource_type: 'auto',
      });

      logger.info('Retrieved resume URL from Cloudinary', { cloudinaryId });
      return resource.secure_url;
    } catch (error) {
      logger.error('Failed to get resume from Cloudinary', {
        error,
        cloudinaryId,
      });
      throw error;
    }
  }

  /**
   * Get resume text content
   * Downloads and returns text for AI processing
   */
  async getResumeText(cloudinaryId: string): Promise<string> {
    this.ensureConfigured();

    try {
      logger.info('Fetching resume text from Cloudinary', { cloudinaryId });

      // Get the resource info
      const resource = await cloudinary.api.resource(cloudinaryId, {
        resource_type: 'auto',
      });

      const response = await fetch(resource.secure_url);
      if (!response.ok) {
        throw new Error(
          `Failed to download resume from Cloudinary (HTTP ${response.status})`
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get('content-type') || resource.format || undefined;

      // Handles PDF and DOCX, not just plain text.
      const text = await extractResumeTextFromBuffer(
        buffer,
        contentType,
        resource.secure_url
      );

      logger.info('Resume text retrieved from Cloudinary', {
        cloudinaryId,
        characters: text.length,
      });

      return text;
    } catch (error) {
      logger.error('Failed to get resume text from Cloudinary', {
        error,
        cloudinaryId,
      });
      return '';
    }
  }

  /**
   * List all user resumes
   */
  async listUserResumes(userId: string): Promise<any[]> {
    this.ensureConfigured();

    try {
      const originalResumes = await cloudinary.search
        .expression(`folder:"resumes/${userId}/original"`)
        .execute();

      const tailoredResumes = await cloudinary.search
        .expression(`folder:"resumes/${userId}/tailored"`)
        .execute();

      const all = [
        ...(originalResumes.resources || []),
        ...(tailoredResumes.resources || []),
      ];

      logger.info('Listed user resumes from Cloudinary', {
        userId,
        count: all.length,
      });

      return all;
    } catch (error) {
      logger.error('Failed to list resumes from Cloudinary', { error, userId });
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalStorage: number;
    originalCount: number;
    tailoredCount: number;
  }> {
    try {
      const resumes = await this.listUserResumes(userId);

      const totalStorage = resumes.reduce((sum: number, file: any) => sum + (file.bytes || 0), 0);
      const originalCount = resumes.filter(
        (f: any) => f.folder?.includes('original')
      ).length;
      const tailoredCount = resumes.filter(
        (f: any) => f.folder?.includes('tailored')
      ).length;

      return {
        totalFiles: resumes.length,
        totalStorage,
        originalCount,
        tailoredCount,
      };
    } catch (error) {
      logger.error('Failed to get storage stats', { error, userId });
      return {
        totalFiles: 0,
        totalStorage: 0,
        originalCount: 0,
        tailoredCount: 0,
      };
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Allowed: PDF, TXT, DOC, DOCX');
    }

    // Check file size (20MB max for Cloudinary free tier)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 20MB.');
    }
  }

  /**
   * Determine Cloudinary resource type from MIME type
   */
  private getResourceType(mimetype: string): 'auto' | 'raw' {
    if (mimetype.includes('pdf') || mimetype.includes('document')) {
      return 'raw';
    }
    if (mimetype.includes('text')) {
      return 'raw';
    }
    return 'auto';
  }
}
