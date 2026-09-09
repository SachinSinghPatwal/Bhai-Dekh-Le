import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(cors({
  origin:process.env.FRONTEND_URL,
  credentials:true
}))
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser())

import jobRoutes from "./routes/job.routes.js";
import automationRoutes from "./routes/automation.routes.js";
import userAutomationRoutes from "./routes/user-automation.routes.js";
import cloudinaryRoutes from "./routes/cloudinary.routes.js";

app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/automation", automationRoutes);
app.use("/api/v1/users", userAutomationRoutes);
app.use("/api/v1/cloud", cloudinaryRoutes);
// app.use("/api/v1/users", UserRoutes);

export default app