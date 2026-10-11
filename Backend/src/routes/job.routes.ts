import { Router } from "express";
import { getAllJobs } from "../controllers/job.controller.js";
import { jobMiddleware } from "../middlewares/job.middleware.js";

const router = Router();

router.get("/getAll", jobMiddleware, getAllJobs);


export default router;