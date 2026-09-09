import express from 'express';
import { asyncHandler } from '../utility/asyncHandler.js';
import {
  authenticateUser,
  scrapeJobs,
  applyToJobs,
  getAutomationStatus,
  stopAutomation,
  runFullPipeline,
  getPipelineStatus,
} from '../controllers/automation.controller.js';

const router = express.Router();

// Individual automation routes
router.post('/auth/naukri', asyncHandler(authenticateUser));
router.post('/scrape', asyncHandler(scrapeJobs));
router.post('/apply', asyncHandler(applyToJobs));
router.get('/status', asyncHandler(getAutomationStatus));
router.post('/stop', asyncHandler(stopAutomation));

// Full pipeline route - runs everything in sequence
router.post('/full', asyncHandler(runFullPipeline));
router.get('/full/status', asyncHandler(getPipelineStatus));

export default router;
