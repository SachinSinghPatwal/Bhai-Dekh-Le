import type { Request, Response } from "express";
import { AsyncHandler } from "../utility/endpointWrapper/AsyncHandler.js";
import { ApiResponse } from "../utility/endpointWrapper/ApiResponse.js";
import ScheduleJdScrape from "../Features/MessageQueues/service/producer/ScheduleJdScrape.js";
import { triggerManualScrape } from "../Features/Scheduler/ScrapeScheduler.js";

export const triggerNow = AsyncHandler(async (_req: Request, res: Response) => {
  await triggerManualScrape();
  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Scraping session dispatched to workers successfully",
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
