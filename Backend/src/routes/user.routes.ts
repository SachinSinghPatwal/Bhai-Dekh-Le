import { Router } from "express";
import {
  uploadResumeController,
  getUserController,
  updateUserController,
} from "../controllers/user.controller.js";
import { resumeUpload } from "../middlewares/resumeUpload.middleware.js";

const router = Router();

router.post("/upload-resume", resumeUpload.single("resume"), uploadResumeController);
router.get("/profile", getUserController);
router.put("/profile", updateUserController);

export default router;
