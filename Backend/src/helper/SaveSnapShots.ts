import fs from "node:fs/promises";
import path from "node:path";
import { SNAPSHOT_FOLDER_NAME } from "../constants.js";
import { JOB_DETAILS } from "../types.js";
import { getFileFolderNamingConvention } from "./SnapShotsFileNamingConvention.js";
import { encrypt } from "../utility/crypto/encryption.js";
import { getAllSnapshotJobs } from "./getAllSnapShots.js";
import { cleanupStaleSnapshots } from "./cleanupStaleSnapshots.js";

export default async function saveSnapShots(
  scrapedJobs: JOB_DETAILS[],
  platform: string = "naukri",
) {
  if (scrapedJobs.length === 0) {
    throw new Error("No jobs for snapshoting");
  }

  const platformSnapshotDir = path.join(SNAPSHOT_FOLDER_NAME, platform);

  // Check and clean up any stale snapshots older than 1 day for this platform
  await cleanupStaleSnapshots(platformSnapshotDir);

  const previousJobs = await getAllSnapshotJobs(platformSnapshotDir);
  const existingIds = new Set(previousJobs.map((job) => job.jobId));

  const newJobs = [];

  for (const job of scrapedJobs) {
    if (existingIds.has(job.jobId)) {
      continue;
    }

    existingIds.add(job.jobId);
    newJobs.push(job);
  }

  if (newJobs.length == 0) {
    throw new Error("NO unique jobs");
  }

  const { dateFolder, fileName } = getFileFolderNamingConvention(
    newJobs.length,
  );

  const dateDir = path.join(platformSnapshotDir, dateFolder);

  await fs.mkdir(dateDir, { recursive: true });

  const filePath = path.join(dateDir, fileName);

  const encryptedSnapshot = encrypt(newJobs);

  await fs.writeFile(
    filePath,
    JSON.stringify(encryptedSnapshot, null, 2),
    "utf-8",
  );
}
