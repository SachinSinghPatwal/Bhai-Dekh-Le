import {Router} from "express";
import { createJob, getAllJobs, getJobById, updateJob, deleteJob } from "../controllers/job.controller.js";

const router = Router();

router.post("/create", createJob);
router.get("/getAll", getAllJobs);
router.get("/:id", getJobById);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

export default router;