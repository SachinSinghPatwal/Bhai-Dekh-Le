import type { Request, Response } from "express";
import { z } from "zod";
import { AsyncHandler } from "../utility/endpointWrapper/AsyncHandler.js";
import { ApiResponse } from "../utility/endpointWrapper/ApiResponse.js";
import { ApiError } from "../utility/endpointWrapper/ApiError.js";
import ScheduleJdScrape from "../Features/MessageQueues/service/producer/ScheduleJdScrape.js";
import {
  getSchedulePayload,
  setScrapeSchedule,
  registerSseClient,
  isValidInterval,
  triggerManualScrape,
} from "../Features/Scheduler/ScrapeScheduler.js";

const scheduleIntervalSchema = z.object({
  intervalMinutes: z.union([
    z.literal(10),
    z.literal(15),
    z.literal(20),
    z.literal(30),
    z.literal(45),
    z.literal(60),
  ]),
});

export const getSchedule = AsyncHandler(async (_req: Request, res: Response) => {
  const payload = await getSchedulePayload();
  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      data: payload,
      message: "Scraping schedule retrieved successfully",
    }),
  );
});

export const updateSchedule = AsyncHandler(async (req: Request, res: Response) => {
  const parsed = scheduleIntervalSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(
      400,
      "Invalid interval. Allowed values are 10, 15, 20, 30, 45, or 60 minutes.",
    );
  }

  const { intervalMinutes } = parsed.data;

  if (!isValidInterval(intervalMinutes)) {
    throw new ApiError(
      400,
      "Interval must be between 10 minutes and 1 hour (10, 15, 20, 30, 45, 60).",
    );
  }

  const updatedPayload = await setScrapeSchedule(intervalMinutes);

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      data: updatedPayload,
      message: `Scraping schedule updated to every ${intervalMinutes} minutes`,
    }),
  );
});

export const triggerNow = AsyncHandler(async (_req: Request, res: Response) => {
  const payload = await triggerManualScrape();
  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      data: payload,
      message: "Scraping session dispatched to workers successfully",
    }),
  );
});

export const streamSchedule = (req: Request, res: Response): void => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "*",
    "Access-Control-Allow-Credentials": "true",
  });

  res.write(": connected\n\n");

  const unregister = registerSseClient(res);

  req.on("close", () => {
    unregister();
  });
};

export const triggerJdScrape = AsyncHandler(async (_: Request, res: Response) => {
  await ScheduleJdScrape();

  return res.status(202).json(
    new ApiResponse({
      statusCode: 202,
      message: "Job Description scraping and AI rating scheduled to messaging queue successfully",
    }),
  );
});
