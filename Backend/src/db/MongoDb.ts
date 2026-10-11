import mongoose from "mongoose";
import { MONGO_DB_NAME } from "../constants.js";
import log from "../utility/Logger.js";

export default async function connectToMongoDb(): Promise<boolean> {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
    log.warn(
      "MONGO_URI is not defined. Skipping MongoDB connection; backend will operate in offline/snapshot mode.",
    );
    return false;
  }

  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${MONGO_DB_NAME}`);
    log.info("MongoDB connected successfully");
    return true;
  } catch (error) {
    log.error("MONGODB connection FAILED", error);
    process.exit(1);
  }
}
