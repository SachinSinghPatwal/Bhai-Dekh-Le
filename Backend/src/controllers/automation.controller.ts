import { Request, Response } from 'express';
import { NaukriAuthService } from '../services/playwright/naukri/NaukriAuthService.js';
import { NaukriScraperService } from '../services/playwright/naukri/NaukriScraperService.js';
import { NaukriApplierService } from '../services/playwright/naukri/NaukriApplierService.js';
import { FullAutomationPipeline } from '../services/FullAutomationPipeline.js';
import logger from '../utility/logger.js';
import { ApiError } from '../utility/ApiError.js';
import { ApiResponse } from '../utility/ApiResponse.js';

// Track automation state
let automationRunning = false;
let automationError: string | null = null;
let jobsScraped = 0;
let jobsApplied = 0;

/**
 * Authenticate user with Naukri
 * Opens headed browser for manual login
 */
export const authenticateUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    logger.info('Starting Naukri authentication', { userId });

    const authService = new NaukriAuthService();
    const result = await authService.authenticate(userId);

    if (!result.success) {
      throw new ApiError(400, result.message);
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { message: result.message },
          'Authentication successful'
        )
      );
  } catch (error) {
    logger.error('Authentication failed', { error });
    throw error;
  }
};

/**
 * Scrape jobs from Naukri
 */
export const scrapeJobs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (automationRunning) {
      throw new ApiError(400, 'Automation already running');
    }

    const { maxJobs = 50 } = req.body;

    automationRunning = true;
    automationError = null;
    jobsScraped = 0;

    logger.info('Starting job scraping', { userId, maxJobs });

    const scraperService = new NaukriScraperService();
    const jobs = await scraperService.scrapeJobs(userId, maxJobs);

    jobsScraped = jobs.length;
    automationRunning = false;

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { jobsScraped: jobs.length, jobs },
          'Job scraping completed'
        )
      );
  } catch (error) {
    automationRunning = false;
    automationError = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Job scraping failed', { error });
    throw error;
  }
};

/**
 * Apply to jobs using Gemini matching
 */
export const applyToJobs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (automationRunning) {
      throw new ApiError(400, 'Automation already running');
    }

    const threshold = req.body.threshold || 70;

    automationRunning = true;
    automationError = null;
    jobsApplied = 0;

    logger.info('Starting job application', { userId, threshold });

    const applierService = new NaukriApplierService();
    const result = await applierService.applyToJobs(userId, threshold);

    jobsApplied = result.applied;
    automationRunning = false;

    res
      .status(200)
      .json(
        new ApiResponse(200, result, 'Job application completed')
      );
  } catch (error) {
    automationRunning = false;
    automationError = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Job application failed', { error });
    throw error;
  }
};

/**
 * Get automation status
 */
export const getAutomationStatus = async (_req: Request, res: Response) => {
  try {
    const status = {
      isRunning: automationRunning,
      jobsScraped,
      jobsApplied,
      lastError: automationError,
    };

    res
      .status(200)
      .json(
        new ApiResponse(200, status, 'Automation status retrieved')
      );
  } catch (error) {
    logger.error('Failed to get automation status', { error });
    throw error;
  }
};

/**
 * Stop running automation
 */
export const stopAutomation = async (_req: Request, res: Response) => {
  try {
    automationRunning = false;
    logger.info('Automation stopped by user');

    res
      .status(200)
      .json(
        new ApiResponse(200, {}, 'Automation stopped')
      );
  } catch (error) {
    logger.error('Failed to stop automation', { error });
    throw error;
  }
};

/**
 * Run complete automation pipeline
 * Auth → Scrape → Rate → Tailor → Apply → Upload to Profile
 */
export const runFullPipeline = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const {
      skipAuth = false,
      maxJobs = 50,
      matchThreshold = 70,
      tailorResume = true,
      uploadToProfile = true,
    } = req.body;

    logger.info('Starting full automation pipeline', {
      userId,
      options: { skipAuth, maxJobs, matchThreshold, tailorResume, uploadToProfile },
    });

    const pipeline = new FullAutomationPipeline();

    const result = await pipeline.runFullPipeline(userId, {
      skipAuth,
      maxJobs,
      matchThreshold,
      tailorResume,
      uploadToProfile,
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          'Full automation pipeline completed'
        )
      );
  } catch (error) {
    logger.error('Full pipeline failed', { error });
    throw error;
  }
};

/**
 * Get pipeline status for running automation
 */
export const getPipelineStatus = async (_req: Request, res: Response) => {
  // In production, you'd track this in Redis or DB
  // For now, return simple status
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          message: 'Use /api/v1/automation/full to start pipeline',
          endpoints: {
            fullPipeline: 'POST /api/v1/automation/full',
            auth: 'POST /api/v1/automation/auth/naukri',
            scrape: 'POST /api/v1/automation/scrape',
            apply: 'POST /api/v1/automation/apply',
          },
        },
        'Pipeline API info'
      )
    );
};
