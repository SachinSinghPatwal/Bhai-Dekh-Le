import { Request, Response } from 'express';
import { CloudinaryResumeService } from '../services/resume/CloudinaryResumeService.js';
import { User } from '../models/Mongo/user.models.js';
import logger from '../utility/logger.js';
import { ApiError } from '../utility/ApiError.js';
import { ApiResponse } from '../utility/ApiResponse.js';

/**
 * Built on first use rather than at import time. Constructing at module load
 * meant a missing CLOUDINARY_* variable took down the whole server, including
 * the routes that have nothing to do with cloud storage.
 */
let cloudinaryResumeService: CloudinaryResumeService | null = null;

function getCloudinaryService(): CloudinaryResumeService {
  cloudinaryResumeService ??= new CloudinaryResumeService();
  return cloudinaryResumeService;
}

/**
 * Upload resume to Cloudinary (compressed)
 */
export const uploadResumeToCloud = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (!req.file) {
      throw new ApiError(400, 'No file provided');
    }

    logger.info('Uploading resume to Cloudinary', { userId });

    const uploadResult = await getCloudinaryService().uploadResume(
      userId.toString(),
      req.file,
      true // isOriginal
    );

    // Update user record with Cloudinary URL instead of local path
    await User.findByIdAndUpdate(userId, {
      $set: {
        resume: {
          cloudinaryUrl: uploadResult.publicUrl,
          cloudinaryId: uploadResult.cloudinaryId,
          fileName: uploadResult.fileName,
          mimeType: uploadResult.mimeType,
          uploadedAt: uploadResult.uploadedAt,
          storage: 'cloudinary', // Track where it's stored
        },
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            resume: {
              url: uploadResult.publicUrl,
              cloudinaryId: uploadResult.cloudinaryId,
              fileName: uploadResult.fileName,
              fileSize: uploadResult.fileSize,
              uploadedAt: uploadResult.uploadedAt,
            },
          },
          'Resume uploaded to Cloudinary successfully'
        )
      );
  } catch (error) {
    logger.error('Resume upload to Cloudinary failed', { error });
    throw error;
  }
};

/**
 * Get user resume from Cloudinary
 */
export const getUserResume = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const user = await User.findById(userId);
    if (!user || !user.resume) {
      throw new ApiError(404, 'Resume not found');
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            resume: {
              url: user.resume.cloudinaryUrl,
              storage: user.resume.storage ?? 'local',
              fileName: user.resume.fileName,
              uploadedAt: user.resume.uploadedAt,
            },
          },
          'Resume retrieved'
        )
      );
  } catch (error) {
    logger.error('Failed to get resume', { error });
    throw error;
  }
};

/**
 * Get storage statistics
 */
export const getStorageStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const stats = await getCloudinaryService().getStorageStats(userId.toString());

    // Convert bytes to MB
    const storageMB = (stats.totalStorage / (1024 * 1024)).toFixed(2);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            storage: {
              totalFiles: stats.totalFiles,
              totalStorageMB: storageMB,
              originalCount: stats.originalCount,
              tailoredCount: stats.tailoredCount,
            },
          },
          'Storage statistics retrieved'
        )
      );
  } catch (error) {
    logger.error('Failed to get storage stats', { error });
    throw error;
  }
};

/**
 * Delete resume from Cloudinary
 */
export const deleteResumeFromCloud = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const user = await User.findById(userId);
    if (!user || !user.resume) {
      throw new ApiError(404, 'Resume not found');
    }

    const { cloudinaryId } = user.resume;

    // A locally-stored resume has no Cloudinary object to destroy; calling
    // destroy(undefined) would fail with a confusing error.
    if (!cloudinaryId) {
      throw new ApiError(
        400,
        'This resume is not stored in Cloudinary, so there is nothing to delete there.'
      );
    }

    // Delete from Cloudinary
    await getCloudinaryService().deleteResume(cloudinaryId);

    // Remove from user record
    await User.findByIdAndUpdate(userId, {
      $unset: { resume: 1 },
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, {}, 'Resume deleted successfully')
      );
  } catch (error) {
    logger.error('Failed to delete resume', { error });
    throw error;
  }
};
