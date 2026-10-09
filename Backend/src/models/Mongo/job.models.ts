import mongoose, { Document, Schema } from "mongoose";
import { ApiResponse } from "../../utility/endpointWrapper/ApiResponse.js";

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
      unique: [true, "only Unique jobs should be saved"],
    },
    footerPlaceholderLabel: {
      type: String,
      required: true,
    },
    footerPlaceholderColor: {
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
      index: true,
    },
    salaryDetails: {
      type: Object,
      required: true,
    },
    minExp: {
      type: String,
      required: true,
      index: true,
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

jobSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 24 * 60 * 60, //after 24 hours it dissapears
  },
);

jobSchema.post("save", function (error: any, _: any, next: any) {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: `${err.path} is invalid`,
    }));

    return next(
      new ApiResponse({
        statusCode: 202,
        message: `Every Properties are required to be filled - ${errors}`,
      }),
    );
  }

  next(error);
});

export const JobModel = mongoose.model("Job", jobSchema);
