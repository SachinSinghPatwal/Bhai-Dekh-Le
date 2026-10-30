import { Router } from "express";
import {
  uploadResumeController,
  getUserController,
  updateUserController,
} from "../controllers/user.controller.js";
import { resumeUpload } from "../middlewares/resumeUpload.middleware.js";

const router = Router();

router.post(
  "/upload-resume",
  (req, res, next) => {
    resumeUpload.single("resume")(req, res, (err) => {
      if (err) {
        res.status(400).json({
          success: false,
          message: err.message || "File upload validation failed",
        });
        return;
      }
      next();
    });
  },
  uploadResumeController,
);

router.get("/profile", getUserController);
router.put("/profile", updateUserController);

export default router;
