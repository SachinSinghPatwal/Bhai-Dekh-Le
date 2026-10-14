import { Router } from "express";
import { getAllJobs, triggerJdScrape } from "../controllers/job.controller.js";
import { jobMiddleware } from "../middlewares/job.middleware.js";

const router = Router();

router.get("/getAll", jobMiddleware, getAllJobs);
router.post("/scrap-jd", jobMiddleware, triggerJdScrape);
router.get("/scrap-jd", jobMiddleware, triggerJdScrape);

export default router;