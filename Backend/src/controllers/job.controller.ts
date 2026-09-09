import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utility/asyncHandler.js";
import { JobModel, Job } from "../models/Mongo/job.models.js";
import asyncHandlerTry_CatchWrapper from "../utility/asyncHandlerContentWrapper.js";
import { Request,Response } from "express";

import endpointRequestBodyValidation from "../utility/endpointRequestBodyValidation.js";
export const addJob = asyncHandler(async (req, res) => {});

export const createJob = asyncHandler(async (req:Request, res:Response) => {
  const validatedData = endpointRequestBodyValidation(req as Request);
  const job = await asyncHandlerTry_CatchWrapper(async () => {
    return JobModel.create();
  }, validatedData);

  res.status(201).json({
    success: true,
    job,
  });
});

export const getAllJobs = asyncHandler(async (req, res) => {});
export const getJobById = asyncHandler(async (req, res) => {});
export const updateJob = asyncHandler(async (req, res) => {});
export const deleteJob = asyncHandler(async (req, res) => {});
