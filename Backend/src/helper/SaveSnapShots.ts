import fs from "node:fs/promises";
import path from "node:path";
import { FOLDER_NAME } from "../constants.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { getSnapShotFileName } from "./SnapShotsFileNamingConvention.js";
import { encryptSnapshot } from "../utility/crypto/encryption.js";
import { getAllSnapshotJobs } from "./getAllSnapShots.js";

export default async function saveSnapShots(scrapedJobs: JOB_DETAILS[]) {
  if (scrapedJobs.length === 0) {
    return;
  }

  const previousJobs = await getAllSnapshotJobs("./snapShots");
  const existingIds = new Set(previousJobs.map((job) => job.jobId));

  const newJobs = [];

  /**
   * @description This loop checks if the jobId already exists in the existingIds set. 
   * If it does, it skips that job. If it doesn't, 
   * it adds the jobId to the existingIds set and pushes the job to the newJobs array.
   * Ensuring that only unique jobs in the snapshot, preventing duplicates.
   * */ 
  for (const job of scrapedJobs) {
    if (existingIds.has(job.jobId)) {
      continue;
    }

    existingIds.add(job.jobId);
    newJobs.push(job);
  }

  const { dateFolder, fileName } = getSnapShotFileName(newJobs.length);

  const dateDir = path.join(FOLDER_NAME, dateFolder);

  await fs.mkdir(dateDir, { recursive: true });

  const filePath = path.join(dateDir, fileName);

  const encryptedSnapshot = encryptSnapshot(newJobs);

  await fs.writeFile(
    filePath,
    JSON.stringify(encryptedSnapshot, null, 2),
    "utf-8",
  );
}
