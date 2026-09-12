import { asyncHandler } from "../utility/asyncHandler.js";
import { JobModel } from "../models/Mongo/job.models.js";
import asyncHandlerTry_CatchWrapper from "../utility/asyncHandlerContentWrapper.js";
import { Request, RequestHandler, Response } from "express";

import endpointRequestBodyValidation from "../utility/endpointRequestBodyValidation.js";
import Scraper from "../services/Scrapper.js";

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = endpointRequestBodyValidation(req as Request);
  const job = await asyncHandlerTry_CatchWrapper(async () => {
    return JobModel.create();
  }, validatedData);

  res.status(201).json({
    success: true,
    job,
  });
});

export const getAllJobs = asyncHandler(async (req: Request, res: Response) => {
  const data = await Scraper();
  console.log("data from endpoint :", data);
  res.status(200).json({
    success: true,
    data: data,
  });
});
export const getJobById = asyncHandler(async (_req, _res) => {});
export const updateJob = asyncHandler(async (_req, _res) => {});
export const deleteJob = asyncHandler(async (_req, _res) => {});
