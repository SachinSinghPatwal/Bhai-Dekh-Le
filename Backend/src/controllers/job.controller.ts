import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utility/asyncHandler.js";
import { JobModel, Job } from "../models/Mongo/job.models.js";

export const addJob = asyncHandler(async (req, res) => {});
export const createJob = asyncHandler(async (req, res) => {
  // mock data
  const mockJobData: Partial<Job> = {
    title: "Frontend Developer",
    description: "React developer needed",
    staticLink: "https://example.com/job/123",
    company: "Example",
    location: "Remote",
    type: "internship",
    employType: "remote",
    salary: 15000,
  };

  const job = await JobModel.create(mockJobData);
  res.status(201).json({
    success: true,
    job,
  });
});
export const getAllJobs = asyncHandler(async (req, res) => {});
export const getJobById = asyncHandler(async (req, res) => {});
export const updateJob = asyncHandler(async (req, res) => {});
export const deleteJob = asyncHandler(async (req, res) => {});
