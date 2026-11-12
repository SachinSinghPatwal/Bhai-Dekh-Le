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

export interface MatchedJob {
  jobId: string;
  title: string;
  companyName: string;
  jdURL: string;
  keySkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  matchScore: number | null;
  fitVerdict: string;
  aiSummary: string;
  aiRecommendation: string;
  applied: boolean;
  aiEvaluatedAt: string | null;
  minExp: string;
  maxExp: string;
  placeholders: Record<string, string>[];
  createdDate: number | null;
}

export type { CandidateFormValues } from "../schema/candidateSchema";
