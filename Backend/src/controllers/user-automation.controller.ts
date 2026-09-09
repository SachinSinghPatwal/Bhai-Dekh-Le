import { Request, Response } from 'express';
import multer from 'multer';
import { ResumeService } from '../services/resume/ResumeService.js';
import { User } from '../models/Mongo/user.models.js';
import { JobModel } from '../models/Mongo/job.models.js';
import logger from '../utility/logger.js';
import { ApiError } from '../utility/ApiError.js';
import { ApiResponse } from '../utility/ApiResponse.js';

const resumeService = new ResumeService();

/**
 * Upload user resume
 */
export const uploadResume = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (!req.file) {
      throw new ApiError(400, 'No file provided');
    }

    logger.info('Uploading resume', { userId });

    const resumeData = await resumeService.saveResume(userId, req.file);

    // Update user record
    await User.findByIdAndUpdate(userId, {
      $set: {
        resume: {
          path: resumeData.path,
          fileName: resumeData.fileName,
          uploadedAt: resumeData.uploadedAt,
        },
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { resume: resumeData },
          'Resume uploaded successfully'
        )
      );
  } catch (error) {
    logger.error('Resume upload failed', { error });
    throw error;
  }
};

/**
 * Update job preferences
 */
export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const preferences = req.body;

    logger.info('Updating job preferences', { userId });

    await User.findByIdAndUpdate(userId, {
      $set: { jobPreferences: preferences },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { preferences },
          'Preferences updated successfully'
        )
      );
  } catch (error) {
    logger.error('Failed to update preferences', { error });
    throw error;
  }
};

/**
 * Get user applications
 */
export const getUserApplications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const applications = await JobModel.find({
      userId,
      applicationStatus: { $ne: 'pending' },
    }).sort({ appliedAt: -1 });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { applications, count: applications.length },
          'Applications retrieved'
        )
      );
  } catch (error) {
    logger.error('Failed to get applications', { error });
    throw error;
  }
};

/**
 * Get automation stats
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const stats = await JobModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          applied: {
            $sum: { $cond: [{ $eq: ['$applicationStatus', 'applied'] }, 1, 0] },
          },
          skipped: {
            $sum: { $cond: [{ $eq: ['$applicationStatus', 'skipped'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$applicationStatus', 'failed'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$applicationStatus', 'pending'] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalJobs: 0,
      applied: 0,
      skipped: 0,
      failed: 0,
      pending: 0,
    };

    res
      .status(200)
      .json(
        new ApiResponse(200, result, 'Stats retrieved')
      );
  } catch (error) {
    logger.error('Failed to get stats', { error });
    throw error;
  }
};
