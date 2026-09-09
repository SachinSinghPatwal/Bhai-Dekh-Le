import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import logger from '../../utility/logger.js';
import { GeminiMatchResult } from '../../types/automation.types.js';

/**
 * Uses Google Gemini AI to rate resume-job compatibility
 */
export class GeminiMatchingService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Rate how well a resume matches a job
   */
  async rateJobMatch(
    resumeText: string,
    jobTitle: string,
    jobDescription: string,
    threshold: number = 70
  ): Promise<GeminiMatchResult> {
    try {
      logger.debug('Rating job match', { jobTitle, threshold });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `You are a job matching expert. Analyze how well this resume matches the job requirements.

Resume:
${resumeText || 'No resume provided'}

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Rate the match on a scale of 0-100 where:
- 0-30: Poor match
- 31-60: Moderate match
- 61-80: Good match
- 81-100: Excellent match

Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<2-3 sentence explanation>",
  "shouldApply": <boolean>
}

Set shouldApply to true if score >= ${threshold}`;

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
   * Extract text from resume file
   * Supports PDF and text files
   */
  async extractResumeText(resumePath: string): Promise<string> {
    try {
      if (!fs.existsSync(resumePath)) {
        throw new Error(`Resume file not found: ${resumePath}`);
      }

      const ext = path.extname(resumePath).toLowerCase();

      if (ext === '.txt') {
        return fs.readFileSync(resumePath, 'utf8');
      }

      if (ext === '.pdf') {
        // For PDF, we'd need a PDF parser library
        // For now, return empty string or implement pdf-parse
        logger.warn('PDF parsing not implemented yet');
        return '';
      }

      logger.warn(`Unsupported resume format: ${ext}`);
      return '';
    } catch (error) {
      logger.error('Failed to extract resume text', { error, resumePath });
      return '';
    }
  }

  /**
   * Generate a cover letter for a job application
   */
  async generateCoverLetter(
    resumeText: string,
    jobTitle: string,
    companyName: string,
    jobDescription: string
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Write a concise, professional cover letter for this job application.

Resume:
${resumeText}

Job Title: ${jobTitle}
Company: ${companyName}

Job Description:
${jobDescription}

Write a 3-paragraph cover letter that:
1. Introduces the candidate and expresses interest
2. Highlights relevant skills and experience
3. Concludes with enthusiasm and call to action

Keep it under 300 words.`;

      const result = await model.generateContent(prompt);
      const coverLetter = result.response.text();

      logger.info('Cover letter generated', { jobTitle, companyName });
      return coverLetter;
    } catch (error) {
      logger.error('Failed to generate cover letter', { error });
      return '';
    }
  }
}
