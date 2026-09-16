import { JOB_DETAILS } from "../models/Mongo/job.models.js";



export default function ValidateJobIsPostedWithinThreeDays(
  each: JOB_DETAILS,
): JOB_DETAILS | undefined {
  const jobAge = Number(
    String(each.footerPlaceholderLabel).split(" ")[0].replace("+", ""),
  );

  if (jobAge <= 1) {
    return each;
  }

  return undefined;
}
