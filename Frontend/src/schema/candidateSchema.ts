import { z } from "zod";

export const candidateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.string().min(2, "Target role is required (e.g., Frontend Engineer)"),
  experienceYears: z.union([
    z.string().min(1, "Experience is required"),
    z.number().min(0, "Experience must be 0 or more")
  ]),
  expectedSalary: z.string().min(1, "Salary expectation or range is required"),
  skillsInput: z.string().optional(),
  skills: z.array(z.string()).min(1, "Please add at least one core skill"),
  searchKeywordsInput: z.string().optional(),
  searchKeywords: z.array(z.string()).min(1, "Add at least one keyword searched on job portals"),
  bio: z.string().optional(),
  graduationStatus: z.enum(["graduated", "pursuing", "other"], {
    errorMap: () => ({ message: "Please select your graduation status" }),
  }),
  graduationDegree: z.string().optional(),
  graduationYear: z.string().min(4, "Graduation year is required (e.g., 2024)"),
  projects: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(1, "Project title is required"),
      description: z.string().min(5, "Brief description is required"),
      techStack: z.string().min(1, "Tech stack is required"),
      link: z.string().optional(),
    })
  ).min(1, "Add at least one key project"),
  resumeFileName: z.string().optional(),
});

export type CandidateFormValues = z.infer<typeof candidateSchema>;
