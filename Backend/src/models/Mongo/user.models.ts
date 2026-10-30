import mongoose, { Schema, Document, Model } from "mongoose";

export interface UserResume {
  path: string;
  fileName?: string;
  uploadedAt?: Date;
  sizeBytes?: number;
}

export interface User extends Document<mongoose.Types.ObjectId> {
  fullname: string;
  role: string;
  email?: string;
  phone?: string;
  links: string[];
  skills: string[];
  resume?: UserResume;
}

const userSchema = new Schema<User>(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    links: [
      {
        type: String,
        trim: true,
      },
    ],
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    resume: {
      path: {
        type: String,
        default: "",
      },
      fileName: {
        type: String,
        default: "",
      },
      uploadedAt: {
        type: Date,
      },
      sizeBytes: {
        type: Number,
      },
    },
  },
  {
    timestamps: true,
  },
);

export const User: Model<User> = mongoose.model<User>("User", userSchema);
