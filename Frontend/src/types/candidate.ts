export interface CandidateProfile {
  fullName: string;
  role: string;
  skills: string[];
  email?: string;
  phone?: string;
  links?: string[];
  resumeUrl?: string;
  resumeFileName?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  platforms?: string[];
  searchKeywords?: string[];
}

export interface JobMetricStats {
  appliedCount: number;
  inReviewCount: number;
  interviewsCount: number;
  offersCount: number;
  rejectionsCount: number;
}

export type { CandidateFormValues } from "../schema/candidateSchema";
