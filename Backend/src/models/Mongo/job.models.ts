import mongoose, { Document, Schema } from "mongoose";

export interface Job extends Document {
  title: string;
  description: string;
  staticLink: string;
  externalLink?: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "internship";
  employType: "remote" | "on-site" | "hybrid";
  salary: number;
}

const jobSchema = new Schema<Job>({
  title: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["full-time", "part-time", "contract", "internship"],
  },
  employType: {
    type: String,
    required: true,
    enum: ["remote", "on-site", "hybrid"],
  },
  staticLink: {
    type: String,
    required: true,
  },
  externalLink: {
    type: String,
    default: null,
  },
  salary: {
    type: Number,
    required: true,
  },
});

export const JobModel = mongoose.model("Job", jobSchema);
