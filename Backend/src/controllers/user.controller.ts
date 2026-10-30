import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../utility/cloudinary.js";
import { User } from "../models/Mongo/user.models.js";
import { getUserDataFromFile, saveUserDataToFile } from "../helper/userDataHelper.js";
import log from "../utility/Logger.js";

function extractEmailFromBuffer(text: string): string {
  const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i);
  return match ? match[0].toLowerCase().trim() : "";
}

function extractPhoneFromBuffer(text: string): string {
  const matches = text.match(/(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}/g);
  if (!matches) return "";
  for (const m of matches) {
    const digitsOnly = m.replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return m.trim();
    }
  }
  return "";
}

function extractLinksFromBuffer(text: string): string[] {
  const found = new Set<string>();
  const uriRegex = /\/URI\s*\(([^()]+)\)/g;
  let match;
  while ((match = uriRegex.exec(text)) !== null) {
    const url = match[1].trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      found.add(url);
    }
  }

  const standardUrlRegex = /https?:\/\/[^\s,;"'()<>\\]+/gi;
  while ((match = standardUrlRegex.exec(text)) !== null) {
    const clean = match[0].replace(/[.,;:)]+$/, "").trim();
    if (clean) found.add(clean);
  }

  const domainUrlRegex = /\b(?:github\.com|linkedin\.com\/in|gitlab\.com)[^\s,;"'()<>\\]*/gi;
  while ((match = domainUrlRegex.exec(text)) !== null) {
    const clean = match[0].replace(/[.,;:)]+$/, "").trim();
    if (clean) found.add(`https://${clean}`);
  }

  return Array.from(found);
}

function safeParseArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof val === "string" && val.trim().length > 0) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export async function uploadResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    let resumeUrl = body.resumeUrl || "";
    let fileName = body.resumeFileName || "";
    let sizeBytes = Number(body.sizeBytes) || 0;
    let uploadedAt = new Date();

    let extractedEmail = "";
    let extractedPhone = "";
    let extractedLinks: string[] = [];

    if (req.file) {
      log.info(
        `[Resume Upload] Processing resume: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`,
      );

      const bufferText = req.file.buffer.toString("latin1");
      extractedEmail = extractEmailFromBuffer(bufferText);
      extractedPhone = extractPhoneFromBuffer(bufferText);
      extractedLinks = extractLinksFromBuffer(bufferText);

      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: "bhaidekhle/resumes",
        resource_type: "raw",
        filename_override: req.file.originalname,
      });

      resumeUrl = uploadResult.secure_url;
      fileName = req.file.originalname;
      sizeBytes = req.file.size;
      uploadedAt = new Date();
    }

    const providedSkills = safeParseArray(body.skills);
    const providedLinks = safeParseArray(body.links);

    const resolvedFullname = (body.fullName || body.fullname || "Candidate").trim();
    const resolvedRole = (body.role || "").trim();
    const resolvedEmail = (body.email || extractedEmail || "").trim();
    const resolvedPhone = (body.phone || body.phoneNumber || extractedPhone || "").trim();
    const resolvedLinks = Array.from(new Set([...providedLinks, ...extractedLinks]));
    const resolvedSkills = providedSkills;

    if (mongoose.connection.readyState === 1) {
      try {
        let user = await User.findOne();
        if (user) {
          user.fullname = resolvedFullname;
          user.role = resolvedRole;
          if (resolvedEmail) user.email = resolvedEmail;
          if (resolvedPhone) user.phone = resolvedPhone;
          if (resolvedLinks.length > 0) user.links = resolvedLinks;
          if (resolvedSkills.length > 0) user.skills = resolvedSkills;
          if (resumeUrl) {
            user.resume = {
              path: resumeUrl,
              fileName: fileName || user.resume?.fileName,
              uploadedAt,
              sizeBytes: sizeBytes || user.resume?.sizeBytes,
            };
          }
          await user.save();
        } else {
          user = await User.create({
            fullname: resolvedFullname,
            role: resolvedRole,
            email: resolvedEmail,
            phone: resolvedPhone,
            links: resolvedLinks,
            skills: resolvedSkills,
            resume: resumeUrl
              ? {
                  path: resumeUrl,
                  fileName,
                  uploadedAt,
                  sizeBytes,
                }
              : undefined,
          });
        }
        log.info("[Resume Upload] Synced user profile and resume URL to MongoDB User document");
      } catch (dbErr) {
        log.warn("[Resume Upload] Could not update MongoDB User record:", dbErr);
      }
    }

    const fileData = (await getUserDataFromFile()) ?? { personalDetails: {} };
    if (!fileData.personalDetails) {
      fileData.personalDetails = {};
    }
    fileData.personalDetails.name = resolvedFullname;
    fileData.personalDetails.fullName = resolvedFullname;
    fileData.personalDetails.role = resolvedRole;
    if (resolvedEmail) fileData.personalDetails.email = resolvedEmail;
    if (resolvedPhone) fileData.personalDetails.phone = resolvedPhone;
    if (resolvedLinks.length > 0) fileData.personalDetails.links = resolvedLinks;
    if (resolvedSkills.length > 0) fileData.personalDetails.skills = resolvedSkills;
    if (resumeUrl) {
      fileData.personalDetails.resumePath = resumeUrl;
      fileData.personalDetails.resumeLink = resumeUrl;
      fileData.personalDetails.resumeFileName = fileName;
    }
    fileData.updatedAt = new Date().toISOString();

    await saveUserDataToFile(fileData);

    res.status(200).json({
      success: true,
      message: "Profile and resume successfully saved to Cloudinary and database",
      data: {
        fullName: resolvedFullname,
        role: resolvedRole,
        email: resolvedEmail,
        phone: resolvedPhone,
        links: resolvedLinks,
        skills: resolvedSkills,
        resumeUrl,
        resumeFileName: fileName,
        uploadedAt,
        sizeBytes,
      },
    });
  } catch (error: any) {
    log.error("[Resume Upload] Error during upload:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to upload resume to Cloudinary or save profile",
    });
  }
}

export async function getUserController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update user details",
    });
  }
}

export async function updateUserController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updatePayload = req.body;

    if (mongoose.connection.readyState === 1) {
      try {
        const existingUser = await User.findOne();
        if (existingUser) {
          Object.assign(existingUser, updatePayload);
          await existingUser.save();
        } else if (updatePayload.fullname || updatePayload.fullName) {
          await User.create({
            fullname: updatePayload.fullName || updatePayload.fullname,
            role: updatePayload.role || "",
            email: updatePayload.email || "",
            phone: updatePayload.phone || "",
            links: updatePayload.links || [],
            skills: updatePayload.skills || [],
            resume: updatePayload.resume,
          });
        }
      } catch (dbErr) {
        log.warn("[User Controller] DB update error:", dbErr);
      }
    }

    const existing = (await getUserDataFromFile()) ?? {};
    const merged = { ...existing, ...updatePayload, updatedAt: new Date().toISOString() };
    await saveUserDataToFile(merged);

    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      data: merged,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update user details",
    });
  }
}
