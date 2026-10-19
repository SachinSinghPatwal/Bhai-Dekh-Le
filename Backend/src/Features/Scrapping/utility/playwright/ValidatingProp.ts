import { JOB_DETAILS } from "../../index.js";

export default function ValidatingProp(
  each: any,
): JOB_DETAILS | undefined {
  const jobAge = Number(
    String(each.footerPlaceholderLabel).split(" ")[0].replace("+", ""),
  );

  if (jobAge <= 1 || each.footerPlaceholderColor == "green") {
    const {
      title,
      jobId,
      footerPlaceholderLabel,
      companyName,
      tagsAndSkills,
      placeholders,
      jdURL,
      jobDescription: JD,
      createdDate,
      salaryDetail: salaryDetails,
      minimumExperience: minExp,
      maximumExperience: maxExp,
      applyByTime,
      walkinJob: walkIn,
      footerPlaceholderColor,
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
      footerPlaceholderColor,
    } as JOB_DETAILS;
  }
  return undefined;
}

const ValidateJobIsPostedWithinSetDays = ValidatingProp;
export { ValidateJobIsPostedWithinSetDays };
