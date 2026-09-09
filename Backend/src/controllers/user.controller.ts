import type { CookieOptions, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/Mongo/user.models.js";
import { ApiError } from "../utility/ApiError.js";
import { ApiResponse } from "../utility/ApiResponse.js";
import { asyncHandler } from "../utility/asyncHandler.js";
import logger from "../utility/logger.js";

/**
 * Cookies are httpOnly so browser JS cannot read the tokens. `secure` is only
 * enabled in production because local development runs over plain http.
 */
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

/**
 * Issues a fresh access/refresh pair and persists the refresh token so it can
 * be rotated and revoked later.
 */
async function generateTokens(userId: mongoose.Types.ObjectId | string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found while generating tokens");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
}

/**
 * POST /api/v1/auth/register
 * Body: { username, email, fullname, password }
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, fullname, password } = req.body ?? {};

  const missing = ["username", "email", "fullname", "password"].filter(
    (field) => typeof req.body?.[field] !== "string" || !req.body[field].trim(),
  );

  if (missing.length > 0) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(", ")}`);
  }

  const existing = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
  });

  if (existing) {
    throw new ApiError(409, "A user with that username or email already exists");
  }

  // The pre-save hook hashes the password, so it is stored via .create() only.
  const created = await User.create({
    username,
    email,
    fullname,
    password,
  });

  const user = await User.findById(created._id).select("-password -refreshToken");

  logger.info("User registered", { userId: created._id.toString(), username });

  res
    .status(201)
    .json(new ApiResponse(201, { user }, "User registered successfully"));
});

/**
 * POST /api/v1/auth/login
 * Body: { password, and one of username | email }
 */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body ?? {};

  if (!username && !email) {
    throw new ApiError(400, "Either username or email is required");
  }

  if (typeof password !== "string" || !password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [
      ...(username ? [{ username: String(username).toLowerCase() }] : []),
      ...(email ? [{ email: String(email).toLowerCase() }] : []),
    ],
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const passwordMatches = await user.isPasswordCorrect(password);
  if (!passwordMatches) {
    // Same message as the missing-user case so the endpoint does not reveal
    // which usernames exist.
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateTokens(user._id as mongoose.Types.ObjectId);

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  logger.info("User logged in", { userId: user._id?.toString() });

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: safeUser, accessToken, refreshToken },
        "Logged in successfully",
      ),
    );
});

/**
 * POST /api/v1/auth/logout  (protected)
 */
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  await User.findByIdAndUpdate(req.user?._id, {
    $unset: { refreshToken: 1 },
  });

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

/**
 * POST /api/v1/auth/refresh-token
 * Reads the refresh token from a cookie or from the request body.
 */
export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response) => {
    const incoming = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incoming) {
      throw new ApiError(401, "Refresh token is required");
    }

    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
      throw new ApiError(
        500,
        "Server misconfigured: REFRESH_TOKEN_SECRET is not set",
      );
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(incoming, secret) as JwtPayload;
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(payload._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token: user not found");
    }

    // Reject tokens that were already rotated away or revoked by logout.
    if (user.refreshToken !== incoming) {
      throw new ApiError(401, "Refresh token has been used or revoked");
    }

    const { accessToken, refreshToken } = await generateTokens(user._id as mongoose.Types.ObjectId);

    res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed",
        ),
      );
  },
);

/**
 * GET /api/v1/auth/me  (protected)
 * Handy for confirming a token works and for grabbing your own userId, which
 * every CLI script needs.
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "Current user fetched"));
});

/**
 * POST /api/v1/auth/change-password  (protected)
 * Body: { oldPassword, newPassword }
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body ?? {};

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both oldPassword and newPassword are required");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const matches = await user.isPasswordCorrect(oldPassword);
  if (!matches) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Assigning triggers the pre-save hash hook.
  user.password = newPassword;
  await user.save();

  res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});
