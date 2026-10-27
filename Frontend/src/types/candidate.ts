export interface CandidateProfile {
  fullName: string;
  role: string;
  skills: string[];    // extracted from resume or added manually
  platforms?: string[]; // optional legacy
  resumeFileName?: string;
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
