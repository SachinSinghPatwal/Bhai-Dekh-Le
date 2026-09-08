import mongoose from "mongoose";
import { MONGO_DB_NAME } from "../constants.js";

export default async function connectToMongoDb() {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${MONGO_DB_NAME}`,
    );
    console.log(`Connected to MongoDB: ${connectionInstance.connection.host}`);
  } catch (error: unknown) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}
