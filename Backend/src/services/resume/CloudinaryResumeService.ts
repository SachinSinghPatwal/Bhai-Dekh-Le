import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import logger from '../../utility/logger.js';

/**
 * Cloud-based resume storage using Cloudinary
 * Supports compressed file upload and retrieval
 * Saves storage by compressing PDFs and documents
 */
export class CloudinaryResumeService {
  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary credentials not found in environment variables'
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

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
    uploadedAt: Date;
  }> {
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
    try {
      logger.info('Fetching resume text from Cloudinary', { cloudinaryId });

      // Get the resource info
      const resource = await cloudinary.api.resource(cloudinaryId, {
        resource_type: 'auto',
      });

      // For text files, directly fetch
      if (resource.resource_type === 'raw') {
        const response = await fetch(resource.secure_url);
        const text = await response.text();
        logger.info('Resume text retrieved from Cloudinary');
        return text;
      }

      // For PDFs, would need pdf-parse library
      logger.warn('PDF text extraction requires additional library');
      return '';
    } catch (error) {
      logger.error('Failed to get resume text from Cloudinary', { error });
      return '';
    }
  }

  /**
   * List all user resumes
   */
  async listUserResumes(userId: string): Promise<any[]> {
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
