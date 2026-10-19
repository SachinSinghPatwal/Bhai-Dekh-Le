import mongoose from "mongoose";
import { MONGO_DB_NAME } from "../index.js";

export default async function connectToDb(): Promise<boolean> {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
    return false;
  }
  await mongoose.connect(`${process.env.MONGO_URI}/${MONGO_DB_NAME}`);
  return true;
}

const connectToMongoDb = connectToDb;
export { connectToMongoDb };
