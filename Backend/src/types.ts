import { JOB_DETAILS } from "./models/Mongo/job.models.js";

export interface RequestParams {
  url: URL;
  request: string;
  headers: Record<string, string>;
  readonly totalJobsAvailable?: number;
  initialbatchOfJobs: JOB_DETAILS[];
  workerId: string;
  retryStartingPage: number | null;
}

