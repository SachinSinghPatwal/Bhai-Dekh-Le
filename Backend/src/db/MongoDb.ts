import mongoose from "mongoose";
import { MONGO_DB_NAME } from "../constants.js";

export default async function connectToMongoDb()  {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${MONGO_DB_NAME}`,
    );
    console.log(
      `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`,
    );
  } catch (error) {
    console.log("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};
