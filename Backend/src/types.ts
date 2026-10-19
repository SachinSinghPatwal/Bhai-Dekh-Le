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

export interface NEW_ENVIRONMENT_DUE_TO_CRASH_PARAMS_TYPES {
  attempt: number;
  customMaxRetries: Record<string, number>;
  workerId: string;
  composedURL: string;
  lastPageCrashed: number | null;
  errorMessage: string;
}

export interface NEW_ENVIRONMENT_DUE_TO_CRASH_RETURNED_TYPES {
  newUrl:URL;
  newHeaders:Record<string,string>;
  newRequest:string;
  newJobDetails:JOB_DETAILS[];
}
