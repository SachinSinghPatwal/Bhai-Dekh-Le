import mongoose, { Schema, Document } from "mongoose";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";

interface User extends Document {
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  coverImage?: string;
  watchHistory: mongoose.Types.ObjectId[];
  password: string;
  refreshToken?: string;
  naukriStorageState?: string;
  resume?: {
    path: string;
    fileName: string;
    uploadedAt: Date;
  };
  jobPreferences?: {
    keywords: string[];
    locations: string[];
    minSalary: number;
    jobTypes: ('full-time' | 'part-time' | 'contract' | 'internship')[];
    employType: ('remote' | 'on-site' | 'hybrid')[];
  };
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
          enum: ['full-time', 'part-time', 'contract', 'internship'],
        },
      ],
      employType: [
        {
          type: String,
          enum: ['remote', 'on-site', 'hybrid'],
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

userSchema.methods.generateAccessToken = function ():string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    } as SignOptions,
  );
};
userSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    } as SignOptions,
  );
};

export const User = mongoose.model("User", userSchema);
