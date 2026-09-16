import { Request } from "playwright";
import { JOB_DETAILS } from "./models/Mongo/job.models.js";

export interface RequestParams {
  url: URL;
  request: Request;
  headers: Record<string, string>;
  readonly totalJobsAvaibles?: number;
  jobDetails: JOB_DETAILS[];
  workerId: string;
  retryStartingPage: number;
}
