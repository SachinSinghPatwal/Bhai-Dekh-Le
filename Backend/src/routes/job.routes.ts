import { Router } from "express";
import {
  triggerNow,
  triggerJdScrape,
  getMatchedJobs,
  updateAppliedStatusBatch,
} from "../controllers/job.controller.js";
import { jobMiddleware } from "../middlewares/job.middleware.js";

const router = Router();

router.post("/trigger-now", triggerNow);
router.post("/scrape-now", triggerNow);

router.post("/scrap-jd", jobMiddleware, triggerJdScrape);
router.get("/scrap-jd", jobMiddleware, triggerJdScrape);

router.get("/matched", getMatchedJobs);
router.post("/applied", updateAppliedStatusBatch);
router.patch("/applied", updateAppliedStatusBatch);

export default router;
