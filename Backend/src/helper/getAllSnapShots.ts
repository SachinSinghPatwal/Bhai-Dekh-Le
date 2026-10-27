import { JOB_DETAILS } from "../types.js";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { decrypt } from "../utility/crypto/decryption.js";
import path from "node:path";
import { SNAPSHOT_FOLDER_NAME } from "../constants.js";

export async function getAllSnapshotJobs(target: string = SNAPSHOT_FOLDER_NAME) {
  const allJobs: JOB_DETAILS[] = [];

  let resolvedDir = target;
  if (target === "naukri" || target === "jobFound") {
    resolvedDir = path.join(SNAPSHOT_FOLDER_NAME, target);
  }

  if (!existsSync(resolvedDir)) {
    return allJobs;
  }

  async function collectJsonFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const jsonPaths: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        jsonPaths.push(...(await collectJsonFiles(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        jsonPaths.push(fullPath);
      }
    }
    return jsonPaths;
  }

  const files = await collectJsonFiles(resolvedDir);

  for (const filePath of files) {
    try {
      const jobs = await decrypt(filePath);
      allJobs.push(...jobs);
    } catch {
      // Ignore corrupted or unreadable snapshot files
    }
  }

  return allJobs;
}
