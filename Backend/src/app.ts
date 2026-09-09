import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

import userRoutes from "./routes/user.routes.js";
import jobRoutes from "./routes/job.routes.js";
import automationRoutes from "./routes/automation.routes.js";
import userAutomationRoutes from "./routes/user-automation.routes.js";
import cloudinaryRoutes from "./routes/cloudinary.routes.js";
import { verifyJWT } from "./middlewares/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

// Liveness probe — deliberately unauthenticated.
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok", uptime: process.uptime() });
});

// Public auth endpoints (register/login/refresh); logout+me are guarded inside.
app.use("/api/v1/auth", userRoutes);

// Everything below needs a valid access token. These controllers all read
// `req.user._id`, which only `verifyJWT` sets.
app.use("/api/v1/jobs", verifyJWT, jobRoutes);
app.use("/api/v1/automation", verifyJWT, automationRoutes);
app.use("/api/v1/users", verifyJWT, userAutomationRoutes);
app.use("/api/v1/cloud", verifyJWT, cloudinaryRoutes);

// Must stay last: 404 for unmatched paths, then the terminal error handler.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
