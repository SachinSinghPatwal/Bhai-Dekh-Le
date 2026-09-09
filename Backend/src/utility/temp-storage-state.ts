import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import logger from './logger.js';

/**
 * Playwright can only load a storageState from a file path, but the session is
 * stored encrypted in MongoDB. These helpers write the decrypted session to a
 * short-lived file and guarantee it is removed afterwards.
 *
 * The file goes to the OS temp directory (not the repo working directory) and
 * is created with owner-only permissions, because it contains live Naukri
 * session cookies.
 */
export function writeTempStorageState(userId: string, storageState: unknown): string {
  const tempPath = path.join(
    os.tmpdir(),
    `naukri-state-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`
  );

  fs.writeFileSync(tempPath, JSON.stringify(storageState), { mode: 0o600 });
  return tempPath;
}

/**
 * Safe to call with null and safe to call twice — intended for use in a
 * `finally` block so the session file is removed even when the run throws.
 */
export function removeTempStorageState(tempPath: string | null): void {
  if (!tempPath) return;

  try {
    fs.unlinkSync(tempPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    // Already gone is not a problem worth logging.
    if (code !== 'ENOENT') {
      logger.warn('Could not remove temp storage state file', { tempPath, code });
    }
  }
}
