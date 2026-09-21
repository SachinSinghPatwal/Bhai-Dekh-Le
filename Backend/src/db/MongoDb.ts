import mongoose from "mongoose";
import { MONGO_DB_NAME } from "../constants.js";
import log from "../utility/Logger.js";

export default async function connectToMongoDb(): Promise<void> {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${MONGO_DB_NAME}`);
  } catch (error) {
    log.error("MONGODB connection FAILED", error);
    process.exit(1);
  }
}
