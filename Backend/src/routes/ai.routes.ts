import { Router } from "express";
import {
  getAiStatusController,
  analyzeResumeController,
  reviewBulletsController,
} from "../controllers/ai.controller.js";
import { resumeUpload } from "../middlewares/resumeUpload.middleware.js";

const router = Router();

/**
 * GET /api/v1/ai/status
 * Check if Gemini AI is configured and ready
 */
router.get("/status", getAiStatusController);

/**
 * GET /api/v1/ai/analyze-resume?url=...
 * Analyze resume from stored user profile or query param URL
 */
router.get("/analyze-resume", analyzeResumeController);

/**
 * POST /api/v1/ai/analyze-resume
 * Supports:
 * 1. Multipart PDF upload via form-data field 'resume'
 * 2. JSON payload with `{ "url": "https://..." }`
 * 3. Empty body to analyze stored user profile resume
 */
router.post(
  "/analyze-resume",
  resumeUpload.single("resume"),
  analyzeResumeController,
);

/**
 * POST /api/v1/ai/review-bullets
 * Body: { "bullets": string[], "targetRole"?: string, "context"?: string }
 * Scores and rewrites resume bullet points using Gemini
 */
router.post("/review-bullets", reviewBulletsController);

export default router;
