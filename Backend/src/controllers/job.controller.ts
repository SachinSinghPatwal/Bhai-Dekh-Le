import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AsyncHandler } from "../utility/endpointWrapper/AsyncHandler.js";
import { ApiResponse } from "../utility/endpointWrapper/ApiResponse.js";
import { ApiError } from "../utility/endpointWrapper/ApiError.js";
import { JobModel } from "../models/Mongo/job.models.js";
import ScheduleJdScrape from "../Features/MessageQueues/service/producer/ScheduleJdScrape.js";
import { triggerManualScrape } from "../Features/Scheduler/ScrapeScheduler.js";
import {
  formatMatchedJobForClient,
  readMatchedJobsFromFile,
  updateAppliedInMatchedJobsFile,
  type MatchedJobRecord,
} from "../helper/matchedJobsHelper.js";

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

export const getMatchedJobs = AsyncHandler(async (_req: Request, res: Response) => {
  let formattedJobs: MatchedJobRecord[] = [];

  if (mongoose.connection.readyState === 1) {
    const dbJobs = await JobModel.find({ isAiMatch: true })
      .sort({ matchScore: -1, aiEvaluatedAt: -1, createdDate: -1 })
      .lean();

    if (dbJobs.length > 0) {
      formattedJobs = dbJobs.map((job) => formatMatchedJobForClient(job));
    }
  }

  if (formattedJobs.length === 0) {
    formattedJobs = await readMatchedJobsFromFile();
  }

  const appliedCount = formattedJobs.filter((j) => j.applied).length;
  const totalMatched = formattedJobs.length;

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "AI-matched jobs retrieved successfully",
      data: {
        jobs: formattedJobs,
        totalMatched,
        appliedCount,
        notAppliedCount: totalMatched - appliedCount,
      },
    }),
  );
});

export const updateAppliedStatusBatch = AsyncHandler(
  async (req: Request, res: Response) => {
    const body = req.body ?? {};
    let normalizedUpdates: Array<{ jobId: string; applied: boolean }> = [];

    if (Array.isArray(body.updates)) {
      normalizedUpdates = body.updates
        .filter(
          (item: any) =>
            item &&
            typeof item.jobId === "string" &&
            item.jobId.trim().length > 0 &&
            typeof item.applied === "boolean",
        )
        .map((item: any) => ({
          jobId: item.jobId.trim(),
          applied: item.applied,
        }));
    } else if (
      typeof body.jobId === "string" &&
      body.jobId.trim().length > 0 &&
      typeof body.applied === "boolean"
    ) {
      normalizedUpdates = [
        { jobId: body.jobId.trim(), applied: body.applied },
      ];
    }

    if (normalizedUpdates.length === 0) {
      throw new ApiError(
        400,
        "Request body must contain a non-empty 'updates' array of { jobId, applied }",
      );
    }

    let updatedCount = 0;

    if (mongoose.connection.readyState === 1) {
      const bulkRes = await JobModel.bulkWrite(
        normalizedUpdates.map(({ jobId, applied }) => ({
          updateOne: {
            filter: { jobId },
            update: { $set: { applied } },
          },
        })),
        { ordered: false },
      );
      updatedCount = bulkRes.modifiedCount + bulkRes.matchedCount;
    }

    const fileUpdated = await updateAppliedInMatchedJobsFile(normalizedUpdates);
    if (updatedCount === 0 && fileUpdated > 0) {
      updatedCount = fileUpdated;
    }

    return res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        message: "Job applied statuses updated successfully",
        data: {
          updatedCount,
          updates: normalizedUpdates,
        },
      }),
    );
  },
);
