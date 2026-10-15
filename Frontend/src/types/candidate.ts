export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  techStack: string;
  link?: string;
}

export interface CandidateProfile {
  fullName: string;
  role: string;
  experienceYears: number | string;
  expectedSalary: string;
  skills: string[];
  searchKeywords: string[];
  projects: ProjectItem[];
  bio?: string;
  graduationStatus: 'graduated' | 'pursuing' | 'other';
  graduationDegree?: string;
  graduationYear: string;
  resumeFileName?: string;
}

export interface JobMetricStats {
  appliedCount: number;
  inReviewCount: number;
  interviewsCount: number;
  offersCount: number;
  rejectionsCount: number;
}
