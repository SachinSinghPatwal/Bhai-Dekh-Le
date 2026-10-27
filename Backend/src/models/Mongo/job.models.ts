import mongoose, { Schema } from "mongoose";
import { ApiError } from "../../utility/endpointWrapper/ApiError.js";
import { type JOB_DETAILS } from "../../types.js";

export type { JOB_DETAILS };

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
      default: {},
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
      default: "",
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
    expireAfterSeconds: 3 * 60 * 60, //after 3 hours it dissapears
  },
);

jobSchema.post("save", function (error: any, _: any, next: any) {
  if (error.name === "ValidationError") {
    const errorDetails = Object.values(error.errors || {})
      .map((err: any) => `${err.path}: ${err.message}`)
      .join(", ");

    return next(
      new ApiError(
        400,
        `Validation failed: Every required property must be provided - ${errorDetails}`,
        errorDetails,
      ),
    );
  }

  next(error);
});

export const JobModel = mongoose.model("Job", jobSchema);
