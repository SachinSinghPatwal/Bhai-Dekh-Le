import crypto from "node:crypto";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";

export function encryptSnapshot(jobs: JOB_DETAILS[]) {
  const key = Buffer.from(process.env.SNAPSHOT_ENCRYPTION_KEY!, "hex");

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const jsonData = JSON.stringify(jobs, null, 2);

  const encrypted = Buffer.concat([
    cipher.update(jsonData, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}
