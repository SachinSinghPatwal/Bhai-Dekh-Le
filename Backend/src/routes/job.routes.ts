import { Router } from "express";
import {
  triggerNow,
  triggerJdScrape,
} from "../controllers/job.controller.js";
import { jobMiddleware } from "../middlewares/job.middleware.js";

const router = Router();

router.post("/trigger-now", triggerNow);
router.post("/scrape-now", triggerNow);

router.post("/scrap-jd", jobMiddleware, triggerJdScrape);
router.get("/scrap-jd", jobMiddleware, triggerJdScrape);

export default router;
