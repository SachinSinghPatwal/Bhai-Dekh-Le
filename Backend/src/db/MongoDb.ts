import mongoose from "mongoose";
import { MONGO_DB_NAME } from "../constants.js";

/**
 * Reads the connection string from MONGODB_URI, falling back to the legacy
 * MONGO_URI name. The docs and .env.example standardise on MONGODB_URI, but
 * older local .env files use MONGO_URI — accepting both avoids a silent
 * `mongodb://undefined/...` connection failure.
 */
function resolveMongoUri(): string {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to Backend/.env (e.g. MONGODB_URI=mongodb://localhost:27017)",
    );
  }

  // Trim a trailing slash so we never build `mongodb://host//dbname`.
  return uri.replace(/\/+$/, "");
}

export default async function connectToMongoDb() {
  const dbName = process.env.MONGO_DB_NAME || MONGO_DB_NAME;
  const connectionInstance = await mongoose.connect(
    `${resolveMongoUri()}/${dbName}`,
  );

  console.log(
    `Connected to MongoDB: ${connectionInstance.connection.host}/${dbName}`,
  );

  return connectionInstance;
}

/**
 * Used by the CLI scripts so the process can exit cleanly instead of hanging
 * on an open connection pool.
 */
export async function disconnectFromMongoDb() {
  await mongoose.disconnect();
}
