import { AsyncHandler } from "../utility/endpointWrapper/AsyncHandler.js";
import type { Request, Response } from "express";
import ScheduleScrapping from "../Features/MessageQueues/service/producer/ScheduleScrape.js";
import ScheduleJdScrape from "../Features/MessageQueues/service/producer/ScheduleJdScrape.js";
import { ApiResponse } from "../utility/endpointWrapper/ApiResponse.js";

export const getAllJobs = AsyncHandler(async (_: Request, res: Response) => {
  await ScheduleScrapping();

  return res.status(202).json(
    new ApiResponse({
      statusCode: 202,
      message: "Job scraping scheduled successfully",
    }),
  );
});

export const triggerJdScrape = AsyncHandler(async (_: Request, res: Response) => {
  await ScheduleJdScrape();

  return res.status(202).json(
    new ApiResponse({
      statusCode: 202,
      message: "Job Description scraping and AI rating scheduled to messaging queue successfully",
    }),
  );
});

