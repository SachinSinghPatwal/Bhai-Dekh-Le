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

import jobRoutes from "./routes/job.routes.js";

app.use("/api/v1/job", jobRoutes);

// Liveness probe — deliberately unauthenticated.
app.get("/api/v1/test", async (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
  });
});


export default app;
