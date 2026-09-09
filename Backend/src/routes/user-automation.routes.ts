import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../utility/asyncHandler.js';
import {
  uploadResume,
  updatePreferences,
  getUserApplications,
  getStats,
} from '../controllers/user-automation.controller.js';

const router = express.Router();

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files allowed'));
    }
  },
});

// User automation routes
router.post(
  '/:userId/resume',
  upload.single('resume'),
  asyncHandler(uploadResume)
);

router.put(
  '/:userId/preferences',
  asyncHandler(updatePreferences)
);

router.get(
  '/:userId/applications',
  asyncHandler(getUserApplications)
);

router.get(
  '/:userId/stats',
  asyncHandler(getStats)
);

export default router;
