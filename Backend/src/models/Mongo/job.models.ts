import mongoose, { Document, Schema } from "mongoose";

export interface JOB_DETAILS extends Document {
  title: string;
  jobId: string;
  footerPlaceholderLabel: string;
  companyName: string;
  tagsAndSkills: string[];
  placeholders: Record<string, string>[];
  jdURL: string;
  JD: string;
  createdDate: number;
  salaryDetails: Record<string, unknown>;
  minExp: string;
  maxExp: string;
  applyByTime: string;
  walkIn: boolean;
}

const jobSchema = new Schema<Required<JOB_DETAILS>>(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    jobId: {
      type: String,
      required: true,
      index: true,
    },
    footerPlaceholderLabel: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    tagsAndSkills: [
      {
        type: String,
        required: true,
        index: true,
      },
    ],
    placeholders: [
      {
        type: Object,
        required: true,
      },
    ],
    jdURL: {
      type: String,
      required: true,
    },
    JD: {
      type: String,
      required: true,
    },
    createdDate: {
      type: Number,
      required: true,
      index:true
    },
    salaryDetails: {
      type: Object,
      required: true,
    },
    minExp: {
      type: String,
      required: true,
      index:true,
    },
    maxExp: {
      type: String,
      required: true,
    },
    applyByTime: {
      type: String,
      required: true,
    },
    walkIn: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const JobModel = mongoose.model("Job", jobSchema);
