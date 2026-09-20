import { AsyncHandler } from "../utility/AsyncHandler.js";
import type { Request, Response } from "express";
import ScheduleScrapping from "../services/RMQ/Producer/ScheduleScrape.js";
import { ApiResponse } from "../utility/ApiResponse.js";


export const getAllJobs = AsyncHandler(async (_: Request, res: Response) => {

  await ScheduleScrapping();

  return res.status(202).json(
    new ApiResponse({
      statusCode: 202,
      message: "Job scraping scheduled successfully",
    }),
  );
});
