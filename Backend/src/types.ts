import type { Document } from "mongoose";

export interface JOB_DETAILS extends Document {
  readonly title: string;
  readonly jobId: string;
  readonly footerPlaceholderLabel: string;
  readonly footerPlaceholderColor: string;
  readonly companyName: string;
  readonly tagsAndSkills: string[];
  readonly placeholders: Record<string, string>[];
  readonly jdURL: string;
  readonly JD: string;
  readonly createdDate: number;
  readonly salaryDetails: Record<string, unknown>;
  readonly minExp: string;
  readonly maxExp: string;
  readonly applyByTime: string;
  readonly walkIn: boolean;
}

export interface RequestParams {
  url?: URL;
  request?: string;
  headers?: Record<string, string>;
  readonly totalJobsAvailable?: number;
  initialbatchOfJobs?: JOB_DETAILS[];
  workerId: string;
  retryStartingPage: number | null;
  platform?: "naukri" | "jobFound" | string;
}

