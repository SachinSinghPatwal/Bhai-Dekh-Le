import { NaukriAuthService } from './playwright/naukri/NaukriAuthService.js';
import { NaukriScraperService } from './playwright/naukri/NaukriScraperService.js';
import { NaukriApplierService } from './playwright/naukri/NaukriApplierService.js';
import { NaukriProfileService } from './playwright/naukri/NaukriProfileService.js';
import { GeminiMatchingService } from './gemini/GeminiMatchingService.js';
import { ResumeTailoringService } from './gemini/ResumeTailoringService.js';
import { User } from '../models/Mongo/user.models.js';
import { JobModel } from '../models/Mongo/job.models.js';
import logger from '../utility/logger.js';
import { assertMongoObjectId } from '../utility/user-id.js';

/**
 * Parent automation orchestrator
 * Runs the complete end-to-end job application pipeline
 */
export class FullAutomationPipeline {
  private authService: NaukriAuthService;
  private scraperService: NaukriScraperService;
  private applierService: NaukriApplierService;
  private profileService: NaukriProfileService;
  private geminiService: GeminiMatchingService;
  private resumeTailoringService: ResumeTailoringService;

  private status = {
    currentStep: '',
    completed: false,
    jobsScraped: 0,
    jobsRated: 0,
    jobsApplied: 0,
    resumesTailored: 0,
    errors: [] as string[],
  };

  constructor() {
    this.authService = new NaukriAuthService();
    this.scraperService = new NaukriScraperService();
    this.applierService = new NaukriApplierService();
    this.profileService = new NaukriProfileService();
    this.geminiService = new GeminiMatchingService();
    this.resumeTailoringService = new ResumeTailoringService();
  }

  /**
   * Run the complete automation pipeline
   *
   * Flow:
   * 1. Authenticate (if needed)
   * 2. Scrape jobs based on preferences
   * 3. Store jobs in database
   * 4. Rate jobs with Gemini
   * 5. Tailor resume for each qualifying job
   * 6. Upload tailored resume to profile
   * 7. Apply to jobs
   */
  async runFullPipeline(
    userId: string,
    options: {
      skipAuth?: boolean;
      maxJobs?: number;
      matchThreshold?: number;
      tailorResume?: boolean;
      uploadToProfile?: boolean;
    } = {}
  ): Promise<typeof this.status> {
    assertMongoObjectId(userId);
    logger.info('Starting full automation pipeline', { userId, options });

    try {
      // STEP 1: Authenticate (if needed)
      if (!options.skipAuth) {
        this.status.currentStep = 'authenticating';
        await this.authenticateUser(userId);
      } else {
        logger.info('Skipping authentication (skipAuth=true)');
      }

      // STEP 2: Scrape jobs
      this.status.currentStep = 'scraping';
      const jobs = await this.scrapeJobs(userId, options.maxJobs || 50);
      this.status.jobsScraped = jobs.length;

      if (jobs.length === 0) {
        logger.warn('No jobs found, stopping pipeline');
        this.status.completed = true;
        return this.status;
      }

      // STEP 3: Get user resume
      this.status.currentStep = 'loading_resume';
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let resumeText = '';
      if (user.resume?.path) {
        resumeText = await this.geminiService.extractResumeText(user.resume.path);
      }

      if (!resumeText) {
        logger.warn('No resume found, job matching will be less accurate');
      }

      // STEP 4: Rate jobs with Gemini
      this.status.currentStep = 'rating_jobs';
      const jobsToApply = await this.rateAllJobs(userId, resumeText, options.matchThreshold || 70);
      this.status.jobsRated = jobsToApply.length;

      if (jobsToApply.length === 0) {
        logger.warn('No jobs matched the criteria, stopping pipeline');
        this.status.completed = true;
        return this.status;
      }

      // STEP 5: Tailor resumes (optional)
      if (options.tailorResume && resumeText) {
        this.status.currentStep = 'tailoring_resumes';
        await this.tailorResumesForJobs(userId, resumeText, jobsToApply);
      }

      // STEP 6: Apply to jobs
      this.status.currentStep = 'applying';
      const applyResult = await this.applyToJobs(userId);
      this.status.jobsApplied = applyResult.applied;

      // STEP 7: Upload best resume to profile (optional)
      if (options.uploadToProfile && resumeText) {
        this.status.currentStep = 'updating_profile';
        await this.uploadBestResumeToProfile(userId, resumeText, jobsToApply);
      }

      this.status.completed = true;
      this.status.currentStep = 'completed';

      logger.info('Full automation pipeline completed', this.status);
      return this.status;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.status.errors.push(errorMsg);
      logger.error('Pipeline failed', { error, status: this.status });
      throw error;
    }
  }

  /**
   * Authenticate user with Naukri
   */
  private async authenticateUser(userId: string): Promise<void> {
    logger.info('Step 1: Authenticating with Naukri');

    const hasValidAuth = await this.authService.hasValidAuth(userId);

    if (hasValidAuth) {
      logger.info('Valid authentication found, skipping login');
      return;
    }

    const result = await this.authService.authenticate(userId);

    if (!result.success) {
      throw new Error(`Authentication failed: ${result.message}`);
    }

    logger.info('Authentication successful');
  }

  /**
   * Scrape jobs from Naukri
   */
  private async scrapeJobs(userId: string, maxJobs: number) {
    logger.info('Step 2: Scraping jobs', { maxJobs });

    const jobs = await this.scraperService.scrapeJobs(userId, maxJobs);

    logger.info(`Scraped ${jobs.length} jobs`);
    return jobs;
  }

  /**
   * Rate all jobs with Gemini AI
   */
  private async rateAllJobs(
    userId: string,
    resumeText: string,
    threshold: number
  ) {
    logger.info('Step 4: Rating jobs with Gemini');

    const pendingJobs = await JobModel.find({
      userId,
      applicationStatus: 'pending',
      platform: 'naukri',
    });

    const qualifyingJobs = [];

    for (const job of pendingJobs) {
      try {
        const matchResult = await this.geminiService.rateJobMatch(
          resumeText,
          job.title,
          job.description,
          threshold
        );

        // Update job with rating
        await JobModel.findByIdAndUpdate(job._id, {
          $set: {
            geminiScore: matchResult.score,
            geminiReasoning: matchResult.reasoning,
            applicationStatus: matchResult.shouldApply ? 'pending' : 'skipped',
          },
        });

        if (matchResult.shouldApply) {
          qualifyingJobs.push(job);
        }

        logger.debug(`Job "${job.title}" rated: ${matchResult.score}`);
      } catch (error) {
        logger.error(`Failed to rate job: ${job.title}`, { error });
      }
    }

    logger.info(`Rated ${pendingJobs.length} jobs, ${qualifyingJobs.length} qualify`);
    return qualifyingJobs;
  }

  /**
   * Tailor resume for each job
   */
  private async tailorResumesForJobs(
    userId: string,
    originalResume: string,
    jobs: any[]
  ) {
    logger.info('Step 5: Tailoring resumes');

    for (const job of jobs.slice(0, 5)) { // Limit to 5 to avoid overwhelming
      try {
        const tailoredResume = await this.resumeTailoringService.tailorResume(
          originalResume,
          job.title,
          job.description
        );

        // Save tailored resume
        const filePath = this.resumeTailoringService.saveTailoredResume(
          tailoredResume,
          userId,
          job.title
        );

        // Store path in job document
        await JobModel.findByIdAndUpdate(job._id, {
          $set: { tailoredResumePath: filePath },
        });

        this.status.resumesTailored++;
        logger.info(`Tailored resume for: ${job.title}`);
      } catch (error) {
        logger.error(`Failed to tailor resume for: ${job.title}`, { error });
      }
    }

    logger.info(`Tailored ${this.status.resumesTailored} resumes`);
  }

  /**
   * Apply to jobs
   */
  private async applyToJobs(userId: string) {
    logger.info('Step 6: Applying to jobs');

    const result = await this.applierService.applyToJobs(userId);

    logger.info(`Applied to ${result.applied} jobs`, result);
    return result;
  }

  /**
   * Upload the best-matched resume to profile
   */
  private async uploadBestResumeToProfile(
    userId: string,
    originalResume: string,
    jobs: any[]
  ) {
    logger.info('Step 7: Uploading resume to profile');

    if (jobs.length === 0) {
      logger.warn('No jobs to tailor resume for');
      return;
    }

    // Find highest scoring job
    const bestJob = jobs.reduce((best, current) =>
      (current.geminiScore || 0) > (best.geminiScore || 0) ? current : best
    );

    // Tailor resume for best job
    const tailoredResume = await this.resumeTailoringService.tailorResume(
      originalResume,
      bestJob.title,
      bestJob.description
    );

    // Save it
    const filePath = this.resumeTailoringService.saveTailoredResume(
      tailoredResume,
      userId,
      'profile-general'
    );

    // Upload to Naukri profile
    const result = await this.profileService.uploadResumeToProfile(userId, filePath);

    if (result.success) {
      logger.info('Resume uploaded to profile successfully');
    } else {
      logger.error('Failed to upload resume to profile', { error: result.message });
    }
  }

  /**
   * Get current pipeline status
   */
  getStatus() {
    return this.status;
  }
}
