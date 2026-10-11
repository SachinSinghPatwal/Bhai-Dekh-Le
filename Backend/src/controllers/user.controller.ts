import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../utility/cloudinary.js";
import { User } from "../models/Mongo/user.models.js";
import { getUserDataFromFile, saveUserDataToFile } from "../helper/userDataHelper.js";
import log from "../utility/Logger.js";

export async function uploadResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No resume file provided. Please upload a PDF or Word document (.pdf, .doc, .docx).",
      });
      return;
    }

    log.info(
      `[Resume Upload] Processing resume: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`,
    );

    // Upload to Cloudinary with proper folder structure
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: "bhaidekhle/resumes",
      resource_type: "raw",
      filename_override: req.file.originalname,
    });

    const resumeUrl = uploadResult.secure_url;
    const uploadedAt = new Date();

    // 1. If MongoDB is connected, save to DB User model
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findOne();
        if (user) {
          user.resume = {
            path: resumeUrl,
            fileName: req.file.originalname,
            uploadedAt,
          };
          await user.save();
        } else {
          await User.create({
            fullname: "Candidate",
            email: "candidate@bhaidekhle.local",
            password: "defaultPassword123",
            resume: {
              path: resumeUrl,
              fileName: req.file.originalname,
              uploadedAt,
            },
          });
        }
        log.info("[Resume Upload] Synced resume URL to MongoDB User document");
      } catch (dbErr) {
        log.warn("[Resume Upload] Could not update MongoDB User record:", dbErr);
      }
    }

    // 2. Persist to local personal/user details JSON
    const fileData = (await getUserDataFromFile()) ?? { personalDetails: {} };
    if (!fileData.personalDetails) {
      fileData.personalDetails = {};
    }
    fileData.personalDetails.resumePath = resumeUrl;
    fileData.personalDetails.resumeLink = resumeUrl;
    fileData.personalDetails.resumeFileName = req.file.originalname;
    fileData.updatedAt = new Date().toISOString();

    await saveUserDataToFile(fileData);

    res.status(200).json({
      success: true,
      message: "Resume successfully uploaded to Cloudinary",
      resumeUrl,
      fileName: req.file.originalname,
      sizeBytes: req.file.size,
      uploadedAt,
    });
  } catch (error: any) {
    log.error("[Resume Upload] Error during upload:", error);
    next(error);
  }
}

export async function getUserController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Try DB first if connected
    if (mongoose.connection.readyState === 1) {
      const dbUser = await User.findOne();
      if (dbUser) {
        res.status(200).json({
          success: true,
          source: "database",
          data: dbUser,
        });
        return;
      }
    }

    // 2. Fallback to file storage
    const fileData = await getUserDataFromFile();
    if (fileData) {
      res.status(200).json({
        success: true,
        source: "file",
        data: fileData,
      });
      return;
    }

    res.status(404).json({
      success: false,
      message: "No user details found in database or local file storage",
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updatePayload = req.body;

    // 1. If MongoDB connected, update or create User
    if (mongoose.connection.readyState === 1 && updatePayload.email) {
      try {
        await User.findOneAndUpdate(
          { email: updatePayload.email },
          { $set: updatePayload },
          { upsert: true, new: true },
        );
      } catch (dbErr) {
        log.warn("[User Controller] DB update error:", dbErr);
      }
    }

    // 2. Save to JSON files
    const existing = (await getUserDataFromFile()) ?? {};
    const merged = { ...existing, ...updatePayload, updatedAt: new Date().toISOString() };
    await saveUserDataToFile(merged);

    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      data: merged,
    });
  } catch (error) {
    next(error);
  }
}
