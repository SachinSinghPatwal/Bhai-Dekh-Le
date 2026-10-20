import { existsSync } from "node:fs";
import { CLIENT_DATA_PATH, log } from "../index.js";

export default function checkSavedSessionAndUserCredentialsForAuth(
  workerId: string,
): Record<string, string> | undefined {
  const hasSavedSession = existsSync(CLIENT_DATA_PATH);
  if (hasSavedSession) {
    log.info(
      `[${workerId}] Authenticated session file found , Session is active.`,
    );
    return;
  }
  const email = process.env.NAUKRI_EMAIL;
  const password = process.env.NAUKRI_PASSWORD;
  const phoneNumber = process.env.NAUKRI_NUMBER!;
  const username = process.env.NAURKI_USERNAME!;

  if (!email || !password) {
    throw new Error(
      `[${workerId}] Missing variables for fresh login.`,
    );
  }

  return { email, password, phoneNumber, username };
}
