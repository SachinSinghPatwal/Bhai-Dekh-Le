export interface JOB_DETAILS {
  title: string;
  jobId: string;
  footerPlaceholderLabel: string;
  companyName: string;
  tagsAndSkills: string;
  placeholders: Record<string, string>[];
  jdURL: string;
  JD: string;
  createdDate: number;
  salaryDetials: Record<string, unknown>;
  minExp: string;
  maxExp: string;
  applyByTime: string;
  walkIn: boolean;
}