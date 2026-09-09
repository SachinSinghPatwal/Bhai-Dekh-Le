import type { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/Mongo/user.models.js";
import { ApiError } from "../utility/ApiError.js";
import { asyncHandler } from "../utility/asyncHandler.js";

/**
 * Pulls the access token from either an httpOnly cookie (browser clients)
 * or an `Authorization: Bearer <token>` header (CLI/curl clients).
 */
function extractToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) return cookieToken;

  const header = req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  return undefined;
}

/**
 * Verifies the access token and attaches the matching user to `req.user`.
 *
 * Every controller in this codebase reads `req.user._id`, so this middleware
 * must run before any protected route.
 */
export const verifyJWT = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, "Unauthorized: no access token provided");
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new ApiError(
        500,
        "Server misconfigured: ACCESS_TOKEN_SECRET is not set",
      );
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, secret) as JwtPayload;
    } catch {
      // Covers expired, malformed and wrongly-signed tokens alike. The reason
      // is deliberately not echoed back to the client.
      throw new ApiError(401, "Unauthorized: invalid or expired access token");
    }

    const user = await User.findById(payload._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      throw new ApiError(401, "Unauthorized: user no longer exists");
    }

    req.user = user;
    next();
  },
);

export default verifyJWT;
