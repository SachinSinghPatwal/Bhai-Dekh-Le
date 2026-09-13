import { AsyncHandler } from "../utility/AsyncHandler.js";
import { JobModel } from "../models/Mongo/job.models.js";
import AsyncHandlerTry_CatchWrapper from "../utility/AsyncHandlerContentWrapper.js";
import { Request, RequestHandler, Response } from "express";

import endpointRequestBodyValidation from "../utility/EndpointRequestBodyValidation.js";
import Scraper from "../services/Scrapper.js";

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
  const data = await Scraper();
  res.status(200).json({
    success: true,
    data: data,
  });
});
export const getJobById = AsyncHandler(async (req: Request, res: Response) => {});
export const updateJob = AsyncHandler(async (req: Request, res: Response) => {});
export const deleteJob = AsyncHandler(async (req: Request, res: Response) => {});
