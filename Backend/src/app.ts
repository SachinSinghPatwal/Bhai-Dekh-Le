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

// import jobRoutes from "./routes/job.routes.js";
import Scraper from "./services/Scrapper.js";


// Liveness probe — deliberately unauthenticated.
app.get("/api/v1/test", async (_req, res) => {
  const data = await Scraper()
  res
    .status(200)
    .json({
      success: true,
      status: "ok",
      uptime: process.uptime(),
      data,
    });
});

// Must stay last: 404 for unmatched paths, then the terminal error handler.
// app.use(notFoundHandler);
// app.use(errorHandler);

export default app;
