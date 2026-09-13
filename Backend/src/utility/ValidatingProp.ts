import { JOB_DETAILS } from "../types.js";


export default function ValidateJobIsPostedWithinThreeDays(
  each: JOB_DETAILS,
): JOB_DETAILS | undefined {
  const jobAge = Number(
    String(each.footerPlaceholderLabel).split(" ")[0].replace("+", ""),
  );

  if (jobAge <= 3) {
    return each;
  }

  return undefined;
}
