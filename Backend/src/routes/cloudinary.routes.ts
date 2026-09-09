import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../utility/asyncHandler.js';
import {
  uploadResumeToCloud,
  getUserResume,
  getStorageStats,
  deleteResumeFromCloud,
} from '../controllers/cloudinary.controller.js';

const router = express.Router();

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for Cloudinary
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, DOC, DOCX files allowed'));
    }
  },
});

// Cloud storage routes
router.post(
  '/upload-cloud',
  upload.single('resume'),
  asyncHandler(uploadResumeToCloud)
);

router.get('/resume-cloud', asyncHandler(getUserResume));

router.get('/storage-stats', asyncHandler(getStorageStats));

router.delete('/delete-cloud', asyncHandler(deleteResumeFromCloud));

export default router;
