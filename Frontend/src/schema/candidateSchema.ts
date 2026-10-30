import { z } from "zod";

export const candidateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.string().min(2, "Please select or enter your target role"),
  skills: z
    .array(z.string())
    .min(1, "At least one skill is required — upload your resume or add manually"),
  email: z.string().optional(),
  phone: z.string().optional(),
  links: z.array(z.string()).optional(),
  resumeFileName: z.string().optional(),
  resumeUrl: z.string().optional(),
});

export type CandidateFormValues = z.infer<typeof candidateSchema>;
