import type { Request, Response, NextFunction } from "express";
import {
  analyzeResumePdf,
  analyzeResumeFromStoredLink,
  reviewResumeBullets,
  isAiConfigured,
} from "../Features/AI/services/GenAi.js";
import log from "../utility/Logger.js";

/**
 * Controller to check Gemini AI readiness & configuration
 */
export async function getAiStatusController(
  _req: Request,
  res: Response,
): Promise<void> {
  const configured = isAiConfigured();
  res.status(200).json({
    success: true,
    configured,
    model: "gemini-2.5-flash",
    message: configured
      ? "Gemini AI is configured and ready."
      : "GEMINI_API_KEY is missing from environment variables.",
  });
}

/**
 * Controller to analyze a resume using Gemini AI:
 * - If a file is uploaded in the request (multipart/form-data with 'resume'), analyzes the buffer directly.
 * - If a 'url' query param or JSON body field is provided, fetches and analyzes from that URL.
 * - Otherwise, falls back to the resume saved in the user's profile/DB.
 */
export async function analyzeResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isAiConfigured()) {
      res.status(503).json({
        success: false,
        message: "Gemini AI is not configured. Please set GEMINI_API_KEY in .env.",
      });
      return;
    }

    // 1. Direct PDF file upload
    if (req.file) {
      log.info(
        `[GenAi Controller] Analyzing uploaded resume: ${req.file.originalname} (${req.file.size} bytes)`,
      );
      const analysis = await analyzeResumePdf(req.file.buffer);
      res.status(200).json({
        success: true,
        source: "upload",
        fileName: req.file.originalname,
        data: analysis,
      });
      return;
    }

    // 2. Custom URL provided in body or query
    const targetUrl =
      (req.body?.url as string | undefined) ||
      (req.query?.url as string | undefined);

    log.info(
      `[GenAi Controller] Analyzing resume from ${targetUrl ? `URL: ${targetUrl}` : "stored user profile"}`,
    );

    const analysis = await analyzeResumeFromStoredLink(targetUrl);

    res.status(200).json({
      success: true,
      source: targetUrl ? "url" : "stored_profile",
      data: analysis,
    });
  } catch (error: any) {
    log.error("[GenAi Controller] Resume analysis failed:", error);
    if (error.message?.includes("No resume link found")) {
      res.status(400).json({
        success: false,
        message:
          "No resume found to analyze. Please upload a PDF file or provide a resume URL.",
      });
      return;
    }
    next(error);
  }
}

/**
 * Controller to review and optimize resume bullet points
 */
export async function reviewBulletsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isAiConfigured()) {
      res.status(503).json({
        success: false,
        message: "Gemini AI is not configured. Please set GEMINI_API_KEY in .env.",
      });
      return;
    }

    const { bullets, targetRole, context } = req.body;

    if (!Array.isArray(bullets) || bullets.length === 0) {
      res.status(400).json({
        success: false,
        message:
          "Invalid request. 'bullets' must be a non-empty array of strings.",
      });
      return;
    }

    const stringBullets = bullets.filter((b) => typeof b === "string" && b.trim().length > 0);
    if (stringBullets.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one non-empty bullet point string is required.",
      });
      return;
    }

    log.info(`[GenAi Controller] Reviewing ${stringBullets.length} resume bullet points`);

    const result = await reviewResumeBullets(stringBullets, targetRole, context);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    log.error("[GenAi Controller] Bullet review failed:", error);
    next(error);
  }
}
