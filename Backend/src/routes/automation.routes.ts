import express, { Request, Response } from 'express';
import { asyncHandler } from '../utility/asyncHandler.js';
import {
  authenticateUser,
  scrapeJobs,
  applyToJobs,
  getAutomationStatus,
  stopAutomation,
} from '../controllers/automation.controller.js';

const router = express.Router();

// Automation routes
router.post('/auth/naukri', asyncHandler(authenticateUser));
router.post('/scrape', asyncHandler(scrapeJobs));
router.post('/apply', asyncHandler(applyToJobs));
router.get('/status', asyncHandler(getAutomationStatus));
router.post('/stop', asyncHandler(stopAutomation));

export default router;
