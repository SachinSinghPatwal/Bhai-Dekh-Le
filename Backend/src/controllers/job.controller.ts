import { AsyncHandler } from "../utility/AsyncHandler.js";
import { JobModel } from "../models/Mongo/job.models.js";
import AsyncHandlerTry_CatchWrapper from "../utility/AsyncHandlerContentWrapper.js";
import type { Request, Response } from "express";

import endpointRequestBodyValidation from "../utility/EndpointRequestBodyValidation.js";
import ScheduleScrapping from "../services/RMQ/Producer/ScheduleScrape.js";
import { ApiResponse } from "../utility/ApiResponse.js";

// export const createJob = AsyncHandler(async (req: Request, res: Response) => {
//   const validatedData = endpointRequestBodyValidation(req as Request);

//   const job = await AsyncHandlerTry_CatchWrapper(async () => {
//     return JobModel.create();
//   }, validatedData);

//   res.status(201).json({
//     success: true,
//     job,
//   });
// });

export const getAllJobs = AsyncHandler(async (_: Request, res: Response) => {
  await ScheduleScrapping();

  return res.status(202).json(
    new ApiResponse({
      statusCode: 202,
      message: "Job scraping scheduled successfully",
    }),
  );
});
