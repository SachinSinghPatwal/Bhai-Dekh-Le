import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SNAPSHOT_FOLDER_NAME } from "../constants.js";
import log from "../utility/Logger.js";
import { getFileFolderNamingConvention } from "./SnapShotsFileNamingConvention.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolves safely to Backend/snapShots regardless of process.cwd()
const DEFAULT_SNAPSHOT_DIR = path.resolve(
  __dirname,
  "../../",
  SNAPSHOT_FOLDER_NAME,
);

export async function cleanupStaleSnapshots(
  targetDir: string = DEFAULT_SNAPSHOT_DIR,
): Promise<void> {

  if (!existsSync(targetDir)) {
    log.debug(`[Snapshot Cleanup] Directory does not exist: ${targetDir}`);
    return;
  }

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const { dateFolder: todayFolder } = getFileFolderNamingConvention(1);
    
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      log.success(
        `Snapshot Found folder`,
      );

      // If the folder name (e.g., "13-10-2026") does not match today ("14-10-2026")
      if (entry.name !== todayFolder) {
        const folderPath = path.join(targetDir, entry.name);
        await fs.rm(folderPath, { recursive: true, force: true });
        log.debug(
          `[Snapshot Cleanup] Deleted stale snapshot folder: ${entry.name}`,
        );
      }
    }
  } catch (error) {
    log.warn(
      "[Snapshot Cleanup] Error deleting stale snapshot folders:",
      error,
    );
  }
}

export default cleanupStaleSnapshots;
