import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import fs from "node:fs/promises";
import { decryptSnapshot } from "../utility/crypto/decryption.js";
import path from "node:path";

export async function getAllSnapshotJobs(rootDir: string) {
  const allJobs: JOB_DETAILS[] = [];

  const dateFolders = await fs.readdir(rootDir, {
    withFileTypes: true,
  });

  for (const folder of dateFolders) {
    if (!folder.isDirectory()) continue;

    const folderPath = path.join(rootDir, folder.name);

    const files = await fs.readdir(folderPath);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(folderPath, file);

      const jobs = await decryptSnapshot(filePath);

      allJobs.push(...jobs);
    }
  }

  return allJobs;
}
