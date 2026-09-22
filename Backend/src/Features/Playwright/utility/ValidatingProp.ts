import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";

export default function ValidateJobIsPostedWithinThreeDays(
  each: JOB_DETAILS,
): JOB_DETAILS | undefined {
  const jobAge = Number(
    String(each.footerPlaceholderLabel).split(" ")[0].replace("+", ""),
  );

  if (jobAge <= 3) {
    const {
      title,
      jobId,
      footerPlaceholderLabel,
      companyName,
      tagsAndSkills,
      placeholders,
      jdURL,
      JD,
      createdDate,
      salaryDetails,
      minExp,
      maxExp,
      applyByTime,
      walkIn,
    } = each;
    return {
      title,
      jobId,
      footerPlaceholderLabel,
      companyName,
      tagsAndSkills,
      placeholders,
      jdURL,
      JD,
      createdDate,
      salaryDetails,
      minExp,
      maxExp,
      applyByTime,
      walkIn,
    } as JOB_DETAILS;
  }
  return undefined;
}
