import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utility/ApiError.js";
import logger from "../utility/logger.js";

/**
 * Terminal error handler.
 *
 * Without this, every `throw new ApiError(...)` reached Express's default
 * handler and was returned as an HTML 500 page, so clients never saw the JSON
 * error envelope the API docs promise.
 *
 * Must be registered last, after all routers.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // Delegate to Express if headers are already on the wire — trying to write a
  // second response would crash the process.
  if (res.headersSent) {
    return next(err);
  }

  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message =
    isApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Internal server error";

  if (statusCode >= 500) {
    logger.error("Unhandled request error", {
      message,
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else {
    logger.warn("Request failed", { statusCode, message });
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    // Alias kept because API_REFERENCE.md documents an `error` field.
    error: message,
    errors: isApiError ? err.errors : [],
    data: null,
    // Stack traces are useful locally but must never reach production clients.
    ...(process.env.NODE_ENV !== "production" && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}

/**
 * Catch-all for unmatched routes so a typo returns JSON 404 rather than
 * Express's HTML "Cannot GET /..." page.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
}
