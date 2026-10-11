import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { User } from "../models/Mongo/user.models.js";
import { getUserDataFromFile } from "../helper/userDataHelper.js";
import log from "../utility/Logger.js";

export interface RequestWithJobContext extends Request {
  userResumeLink?: string | null;
  userProfile?: Record<string, any> | null;
}

/**
 * Retrieves the user's resume link from the MongoDB database
 * or falls back to local userDetails/personalDetails JSON file.
 */
export async function retrieveUserResumeLink(): Promise<string | null> {
  // 1. Check MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.findOne();
      if (user?.resume?.path) {
        return user.resume.path;
      }
    } catch (err) {
      log.warn("[Job Middleware] MongoDB resume retrieval failed:", err);
    }
  }

  // 2. Fallback to local files
  const fileData = await getUserDataFromFile();
  if (fileData?.personalDetails?.resumePath) {
    return fileData.personalDetails.resumePath;
  }
  if (fileData?.personalDetails?.resumeLink) {
    return fileData.personalDetails.resumeLink;
  }

  return null;
}

/**
 * Job middleware attached to job routes to resolve candidate resume link
 * and attach it to the incoming request.
 */
export async function jobMiddleware(
  req: RequestWithJobContext,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resumeLink = await retrieveUserResumeLink();
    req.userResumeLink = resumeLink;

    const profileData = await getUserDataFromFile();
    req.userProfile = profileData;

    log.debug(
      `[Job Middleware] Resolved candidate resume: ${resumeLink ?? "No resume linked yet"}`,
    );

    next();
  } catch (error) {
    log.warn("[Job Middleware] Error in job middleware:", error);
    req.userResumeLink = null;
    next();
  }
}
