import type { JOB_DETAILS } from "../../index.js";

export default function checkIsJobStale(response: JOB_DETAILS[]):boolean {
  // Checking early once we reach jobs older than 1 day
  const jobAge = Number(
    String(response[0]?.footerPlaceholderLabel ?? "")
      .split(" ")[0]
      .replace("+", ""),
  );

  return !isNaN(jobAge) && jobAge > 1;
}
