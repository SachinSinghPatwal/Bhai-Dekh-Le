import mongoose, { Schema, Document, Model } from "mongoose";

export interface UserResume {
  path: string;
  fileName?: string;
  uploadedAt?: Date;
}

export interface JobPreferences {
  keywords: string[];
  locations: string[];
  minSalary: number;
  jobTypes: "full-time" | "part-time" | "contract" | "internship" | null;
  employType: "remote" | "on-site" | "hybrid" | null;
}

export interface User extends Document<mongoose.Types.ObjectId> {
  fullname: string;
  email: string;
  password: string;
  refreshToken?: string;
  resume?: UserResume;
  jobPreferences?: JobPreferences;
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<User>(
  {
    fullname: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    resume: {
      path: {
        type: String,
      },
      fileName: {
        type: String,
      },
      uploadedAt: {
        type: Date,
      },
    },
    jobPreferences: {
      keywords: [
        {
          type: String,
        },
      ],
      locations: {
        type: String,
        default: null,
      },
      minSalary: {
        type: Number,
        default: 0,
      },
      jobTypes: {
        type: String,
        enum: ["full-time", "part-time", "contract", "internship", null],
        default: null,
      },
      employType: {
        type: String,
        enum: ["remote", "on-site", "hybrid", null],
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

export const User: Model<User> = mongoose.model<User>("User", userSchema);
