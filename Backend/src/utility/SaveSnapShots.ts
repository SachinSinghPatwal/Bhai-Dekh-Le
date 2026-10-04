import fs from "node:fs/promises";
import path from "node:path";
import { FOLDER_NAME } from "../constants.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { getSnapShotFileName } from "../helper/SnapShotsFileNamingConvention.js";
import crypto from "node:crypto";
import { encryptSnapshot } from "./encryption.js";

export default async function saveSnapShots(
  jobs: JOB_DETAILS[],
) {
  if (jobs.length === 0) {
    return;
  }

  const { dateFolder, fileName } = getSnapShotFileName(jobs.length);

  const dateDir = path.join(FOLDER_NAME, dateFolder);

  await fs.mkdir(dateDir, { recursive: true });

  const filePath = path.join(dateDir, fileName);

  const encryptedSnapshot = encryptSnapshot(jobs);

  await fs.writeFile(
    filePath,
    JSON.stringify(encryptedSnapshot, null, 2),
    "utf-8",
  );
}
