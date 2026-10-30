import mongoose, { Schema, type Document, type Model } from "mongoose";

export type ScrapeIntervalMinutes = 10 | 15 | 20 | 30 | 45 | 60;

export interface IScrapeSchedule extends Document {
  key: string;
  intervalMinutes: ScrapeIntervalMinutes;
  nextScrapeAt: Date;
  lastScheduledAt?: Date;
  lastStartedAt?: Date;
  isRunning: boolean;
  isConfigured: boolean;
  lockUntil?: Date;
  lockedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scrapeScheduleSchema = new Schema<IScrapeSchedule>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default_scrape_schedule",
    },
    intervalMinutes: {
      type: Number,
      required: true,
      default: 20,
      enum: [10, 15, 20, 30, 45, 60],
    },
    nextScrapeAt: {
      type: Date,
      required: true,
    },
    lastScheduledAt: {
      type: Date,
    },
    lastStartedAt: {
      type: Date,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
    lockUntil: {
      type: Date,
      default: () => new Date(0),
    },
    lockedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export const ScrapeScheduleModel: Model<IScrapeSchedule> =
  mongoose.models.ScrapeSchedule ||
  mongoose.model<IScrapeSchedule>("ScrapeSchedule", scrapeScheduleSchema);
