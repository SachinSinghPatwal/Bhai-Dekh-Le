import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { SNAPSHOT_FOLDER_NAME } from "../constants.js";
import log from "../utility/Logger.js";

/**
 * Checks folders inside Backend/snapShots (format: DD-MM-YYYY).
 * If the folder date is older than today's date, delete the folder.
 * Preserves client.encrypted and personalDetails.personal.
 */
export async function cleanupStaleSnapshots(
  targetDir: string = path.resolve(process.cwd(), SNAPSHOT_FOLDER_NAME),
): Promise<void> {
  if (!existsSync(targetDir)) {
    return;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      // Format is DD-MM-YYYY (e.g. 10-10-2026)
      const parts = entry.name.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const [day, month, year] = parts;
        const folderDate = new Date(year, month - 1, day);

        if (folderDate < today) {
          const folderPath = path.join(targetDir, entry.name);
          await fs.rm(folderPath, { recursive: true, force: true });
          log.info(`[Snapshot Cleanup] Deleted stale snapshot folder: ${entry.name}`);
        }
      }
    }
  } catch (error) {
    log.warn("[Snapshot Cleanup] Error deleting stale snapshot folders:", error);
  }
}

export default cleanupStaleSnapshots;
