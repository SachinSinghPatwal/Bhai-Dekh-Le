import { Request, Response } from 'express';
import multer from 'multer';
import { CloudinaryResumeService } from '../services/resume/CloudinaryResumeService.js';
import { User } from '../models/Mongo/user.models.js';
import logger from '../utility/logger.js';
import { ApiError } from '../utility/ApiError.js';
import { ApiResponse } from '../utility/ApiResponse.js';

const cloudinaryResumeService = new CloudinaryResumeService();

/**
 * Upload resume to Cloudinary (compressed)
 */
export const uploadResumeToCloud = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (!req.file) {
      throw new ApiError(400, 'No file provided');
    }

    logger.info('Uploading resume to Cloudinary', { userId });

    const uploadResult = await cloudinaryResumeService.uploadResume(
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
    const userId = (req as any).user?._id;
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
              url: (user.resume as any).cloudinaryUrl,
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
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const stats = await cloudinaryResumeService.getStorageStats(userId.toString());

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
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const user = await User.findById(userId);
    if (!user || !user.resume) {
      throw new ApiError(404, 'Resume not found');
    }

    const cloudinaryId = (user.resume as any).cloudinaryId;

    // Delete from Cloudinary
    await cloudinaryResumeService.deleteResume(cloudinaryId);

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
