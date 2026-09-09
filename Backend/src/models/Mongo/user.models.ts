import mongoose, { Schema, Document, Model } from "mongoose";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";

export type ResumeStorage = "local" | "cloudinary";

export interface UserResume {
  /** Absolute/relative path on disk. Only set when storage === 'local'. */
  path?: string;
  /** Secure delivery URL. Only set when storage === 'cloudinary'. */
  cloudinaryUrl?: string;
  /** Cloudinary public_id, needed for deletion. */
  cloudinaryId?: string;
  fileName?: string;
  /** MIME type of the stored file, used to pick a text extractor. */
  mimeType?: string;
  uploadedAt?: Date;
  storage?: ResumeStorage;
}

export interface JobPreferences {
  keywords: string[];
  locations: string[];
  minSalary: number;
  jobTypes: ("full-time" | "part-time" | "contract" | "internship")[];
  employType: ("remote" | "on-site" | "hybrid")[];
}

/**
 * `Document` is parameterised with the _id type so that `user._id` is a real
 * ObjectId rather than `unknown`. Without this, every `req.user._id.toString()`
 * in the controllers fails to compile.
 */
export interface User extends Document<mongoose.Types.ObjectId> {
  username: string;
  email: string;
  fullname: string;
  password: string;
  refreshToken?: string;
  naukriStorageState?: string;
  resume?: UserResume;
  jobPreferences?: JobPreferences;
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<User>(
  {
    username: {
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
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
    naukriStorageState: {
      type: String,
    },
    resume: {
      path: {
        type: String,
      },
      cloudinaryUrl: {
        type: String,
      },
      cloudinaryId: {
        type: String,
      },
      fileName: {
        type: String,
      },
      mimeType: {
        type: String,
      },
      uploadedAt: {
        type: Date,
      },
      storage: {
        type: String,
        enum: ["local", "cloudinary"],
        default: "local",
      },
    },
    jobPreferences: {
      keywords: [
        {
          type: String,
        },
      ],
      locations: [
        {
          type: String,
        },
      ],
      minSalary: {
        type: Number,
      },
      jobTypes: [
        {
          type: String,
          enum: ["full-time", "part-time", "contract", "internship"],
        },
      ],
      employType: [
        {
          type: String,
          enum: ["remote", "on-site", "hybrid"],
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not set in the environment");
  }

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    secret,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
    } as SignOptions,
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not set in the environment");
  }

  return jwt.sign(
    {
      _id: this._id,
    },
    secret,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d",
    } as SignOptions,
  );
};

export const User: Model<User> = mongoose.model<User>("User", userSchema);
