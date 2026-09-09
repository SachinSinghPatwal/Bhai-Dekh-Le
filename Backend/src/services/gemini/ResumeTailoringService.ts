import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import logger from '../../utility/logger.js';

/**
 * AI-powered resume tailoring service
 * Customizes resume based on job description for better ATS matching
 */
export class ResumeTailoringService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Tailor resume for a specific job
   * Returns optimized resume text based on JD keywords and requirements
   *
   * IMPORTANT: Only changes wording, preserves layout completely
   * Content pattern: What + How + Why
   */
  async tailorResume(
    originalResume: string,
    jobTitle: string,
    jobDescription: string
  ): Promise<string> {
    try {
      logger.info('Tailoring resume for job', { jobTitle });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are an expert resume optimizer specializing in ATS and keyword optimization.

IMPORTANT RULES:
1. DO NOT change the layout or structure of the resume AT ALL
2. DO NOT add or remove sections
3. DO NOT change formatting, spacing, or line breaks
4. ONLY modify the wording to better match the job description
5. Follow the "What + How + Why" content pattern strictly
6. Keep all facts accurate - do not invent experiences

ORIGINAL RESUME:
${originalResume}

TARGET JOB:
Title: ${jobTitle}
Description: ${jobDescription}

CONTENT PATTERN TO FOLLOW:
For each bullet point or description, ensure it follows:
- WHAT: What did you do/build/create
- HOW: How did you do it (technologies, methods, approach)
- WHY: Why it mattered (impact, results, business value)

TASK:
1. Analyze the resume and identify the existing "What + How + Why" pattern
2. Enhance the wording to incorporate relevant keywords from the job description
3. Make bullets more impactful while following What + How + Why structure
4. Keep exact same formatting, layout, sections, and structure
5. Preserve all headings, spacing, and line breaks exactly

EXAMPLE TRANSFORMATION:
Before: "Built REST API for user management"
After: "Built scalable REST API for user management system (What), using Node.js and Express with JWT authentication (How), reducing authentication time by 40% and improving security compliance (Why)"

RETURN ONLY the optimized resume with EXACT same layout. No explanations, no markdown formatting, just the resume text.`;

      const result = await model.generateContent(prompt);
      const tailoredResume = result.response.text();

      logger.info('Resume tailored successfully', { jobTitle });
      return tailoredResume;
    } catch (error) {
      logger.error('Failed to tailor resume', { error, jobTitle });
      return originalResume; // Return original on failure
    }
  }

  /**
   * Extract key skills and requirements from job description
   */
  async extractJobRequirements(jobDescription: string): Promise<{
    skills: string[];
    requirements: string[];
    keywords: string[];
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Extract key information from this job description:

${jobDescription}

Return JSON format:
{
  "skills": ["skill1", "skill2"],
  "requirements": ["req1", "req2"],
  "keywords": ["keyword1", "keyword2"]
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to extract job requirements', { error });
      return { skills: [], requirements: [], keywords: [] };
    }
  }

  /**
   * Generate multiple resume variations for different job types
   */
  async generateResumeVariations(
    originalResume: string,
    jobTypes: string[]
  ): Promise<Map<string, string>> {
    const variations = new Map<string, string>();

    for (const jobType of jobTypes) {
      try {
        logger.info(`Generating resume variation for: ${jobType}`);

        const tailored = await this.tailorResume(
          originalResume,
          jobType,
          `General ${jobType} position requiring relevant skills and experience`
        );

        variations.set(jobType, tailored);
      } catch (error) {
        logger.error(`Failed to generate variation for ${jobType}`, { error });
      }
    }

    return variations;
  }

  /**
   * Save tailored resume to file
   */
  saveTailoredResume(
    resumeText: string,
    userId: string,
    jobTitle: string
  ): string {
    const userDir = path.join(
      process.env.RESUME_UPLOAD_PATH || './uploads/resumes',
      userId,
      'tailored'
    );

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Sanitize job title for filename
    const sanitizedTitle = jobTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);

    const fileName = `resume-${sanitizedTitle}-${Date.now()}.txt`;
    const filePath = path.join(userDir, fileName);

    fs.writeFileSync(filePath, resumeText);

    logger.info('Tailored resume saved', { filePath });
    return filePath;
  }
}
