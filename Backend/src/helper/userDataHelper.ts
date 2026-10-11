import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PERSONAL_DETAILS_PATH, USER_DETAILS_PATH } from "../constants.js";
import log from "../utility/Logger.js";

export async function getUserDataFromFile(): Promise<Record<string, any> | null> {
  const candidatePaths = [USER_DETAILS_PATH, PERSONAL_DETAILS_PATH];

  for (const filePath of candidatePaths) {
    if (existsSync(filePath)) {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        log.warn(`[UserDataHelper] Failed parsing ${filePath}:`, err);
      }
    }
  }

  return null;
}

export async function saveUserDataToFile(
  data: Record<string, any>,
  targetPath?: string,
): Promise<void> {
  const primaryPath = targetPath ?? (existsSync(USER_DETAILS_PATH) ? USER_DETAILS_PATH : PERSONAL_DETAILS_PATH);
  const dir = path.dirname(primaryPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(primaryPath, JSON.stringify(data, null, 2), "utf-8");

  // Keep userDetails and personalDetails synced if either exists
  if (primaryPath === PERSONAL_DETAILS_PATH && existsSync(USER_DETAILS_PATH)) {
    await fs.writeFile(USER_DETAILS_PATH, JSON.stringify(data, null, 2), "utf-8");
  } else if (primaryPath === USER_DETAILS_PATH && existsSync(PERSONAL_DETAILS_PATH)) {
    await fs.writeFile(PERSONAL_DETAILS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  log.info(`[UserDataHelper] User data saved to ${primaryPath}`);
}
