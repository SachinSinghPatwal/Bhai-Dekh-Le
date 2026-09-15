import { AsyncHandler } from "../utility/AsyncHandler.js";
import { JobModel } from "../models/Mongo/job.models.js";
import AsyncHandlerTry_CatchWrapper from "../utility/AsyncHandlerContentWrapper.js";
import type { Request, Response } from "express";

import endpointRequestBodyValidation from "../utility/EndpointRequestBodyValidation.js";
import ScheduleScrapping from "../services/Infrastructure/RMQ/Producer/ScheduleScrape.js";
import { startScrapConsumer } from "../services/Infrastructure/WorkerManager.js";

export const createJob = AsyncHandler(async (req: Request, res: Response) => {
  const validatedData = endpointRequestBodyValidation(req as Request);

  const job = await AsyncHandlerTry_CatchWrapper(async () => {
    return JobModel.create();
  }, validatedData);

  res.status(201).json({
    success: true,
    job,
  });
});

export const getAllJobs = AsyncHandler(async (req: Request, res: Response) => {
  await startScrapConsumer();
  console.log("worker started listening");
  await ScheduleScrapping();
  res.status(200).json({
    success: true,
  });
});
export const getJobById = AsyncHandler(
  async (req: Request, res: Response) => {},
);
export const updateJob = AsyncHandler(
  async (req: Request, res: Response) => {},
);
export const deleteJob = AsyncHandler(
  async (req: Request, res: Response) => {},
);
