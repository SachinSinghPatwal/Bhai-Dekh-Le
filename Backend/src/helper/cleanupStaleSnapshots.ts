import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SNAPSHOT_FOLDER_NAME, SCRAPING_PLATFORMS } from "../constants.js";
import log from "../utility/Logger.js";
import { getFileFolderNamingConvention } from "./SnapShotsFileNamingConvention.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolves safely to Backend/snapShots regardless of process.cwd()
const DEFAULT_SNAPSHOT_DIR = path.resolve(
  __dirname,
  "../../",
  SNAPSHOT_FOLDER_NAME,
);

const KNOWN_PLATFORMS = SCRAPING_PLATFORMS;

export async function cleanupStaleSnapshots(
  targetDirOrPlatform: string = DEFAULT_SNAPSHOT_DIR,
): Promise<void> {
  const { dateFolder: todayFolder } = getFileFolderNamingConvention(1);

  async function cleanDirectory(dirPath: string) {
    if (!existsSync(dirPath)) {
      log.debug(`[Snapshot Cleanup] Directory does not exist: ${dirPath}`);
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        // If this entry is a platform directory, recurse into it
        if (KNOWN_PLATFORMS.includes(entry.name)) {
          await cleanDirectory(path.join(dirPath, entry.name));
          continue;
        }

        // If the date folder name (e.g., "13-10-2026") does not match today ("14-10-2026")
        if (entry.name !== todayFolder) {
          const folderPath = path.join(dirPath, entry.name);
          await fs.rm(folderPath, { recursive: true, force: true });
          log.debug(
            `[Snapshot Cleanup] Deleted stale snapshot folder: ${folderPath}`,
          );
        }
      }
    } catch (error) {
      log.warn(
        `[Snapshot Cleanup] Error deleting stale snapshot folders in ${dirPath}:`,
        error,
      );
    }
  }

  let targetDir = targetDirOrPlatform;
  if (KNOWN_PLATFORMS.includes(targetDirOrPlatform)) {
    targetDir = path.join(DEFAULT_SNAPSHOT_DIR, targetDirOrPlatform);
  } else if (!path.isAbsolute(targetDirOrPlatform)) {
    targetDir = path.resolve(targetDirOrPlatform);
  }

  await cleanDirectory(targetDir);
}

export default cleanupStaleSnapshots;
