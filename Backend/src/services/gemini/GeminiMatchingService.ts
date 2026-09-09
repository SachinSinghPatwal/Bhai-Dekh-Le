import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utility/logger.js';
import { ApiError } from '../../utility/ApiError.js';
import { extractResumeTextFromFile } from '../../utility/resume-text.js';
import { GeminiMatchResult } from '../../types/automation.types.js';

/**
 * Uses Google Gemini AI to rate resume-job compatibility
 * Only requires GEMINI_API_KEY from environment
 */
export class GeminiMatchingService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        503,
        'AI matching is not configured. Set GEMINI_API_KEY in Backend/.env — see GEMINI_SETUP.md.'
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Rate how well a resume matches a job
   * Simple and direct - just pass resume, job title, and description
   */
  async rateJobMatch(
    resumeText: string,
    jobTitle: string,
    jobDescription: string,
    threshold: number = 70
  ): Promise<GeminiMatchResult> {
    try {
      logger.debug('Rating job match with Gemini', { jobTitle, threshold });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Rate how well this resume matches the job on a scale of 0-100.

RESUME:
${resumeText || 'No resume provided'}

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

Respond ONLY with this JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<brief reason>",
  "shouldApply": <true if score >= ${threshold}, false otherwise>
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid Gemini response format');
      }

      const matchResult = JSON.parse(jsonMatch[0]) as GeminiMatchResult;

      logger.info('Job match rated', {
        jobTitle,
        score: matchResult.score,
        shouldApply: matchResult.shouldApply,
      });

      return matchResult;
    } catch (error) {
      logger.error('Failed to rate job match', { error, jobTitle });
      // Return safe default
      return {
        score: 0,
        reasoning: 'Failed to analyze job match',
        shouldApply: false,
      };
    }
  }

  /**
   * Extract text from a resume file on disk.
   * Supports PDF, DOCX and plain text.
   */
  async extractResumeText(resumePath: string, mimeType?: string): Promise<string> {
    try {
      const text = await extractResumeTextFromFile(resumePath, mimeType);

      if (!text) {
        logger.warn('Resume produced no text', { resumePath });
      }

      return text;
    } catch (error) {
      logger.error('Failed to extract resume text', { error, resumePath });
      return '';
    }
  }
}
