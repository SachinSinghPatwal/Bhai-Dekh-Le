import { Router } from "express";
import {
  getSchedule,
  updateSchedule,
  triggerNow,
  streamSchedule,
  triggerJdScrape,
} from "../controllers/job.controller.js";
import { jobMiddleware } from "../middlewares/job.middleware.js";

const router = Router();

router.get("/schedule", getSchedule);
router.post("/schedule", updateSchedule);
router.post("/set-schedule", updateSchedule);
router.post("/trigger-now", triggerNow);
router.post("/scrape-now", triggerNow);
router.get("/schedule/stream", streamSchedule);

router.post("/scrap-jd", jobMiddleware, triggerJdScrape);
router.get("/scrap-jd", jobMiddleware, triggerJdScrape);

export default router;
