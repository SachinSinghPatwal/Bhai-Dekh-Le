import {Router} from "express";
import {getAllJobs} from "../controllers/job.controller.js";

const router = Router();

router.get("/getAll", getAllJobs);


export default router;