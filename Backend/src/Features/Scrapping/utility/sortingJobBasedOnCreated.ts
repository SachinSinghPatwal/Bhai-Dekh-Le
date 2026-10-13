import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import ValidateJobIsPostedWithinSetDays from "./playwright/ValidatingProp.js";

export function sortingUnsortedJobBasedOnTimeCreated(
  unSortedJobs: JOB_DETAILS[],
) {
  return unSortedJobs
    .filter((job) => {
      const title = String(job.title).toLowerCase();
      return (
        title.includes("react") ||
        title.includes("javascript") ||
        title.includes("web") || 
        title.includes("frontend") ||
        title.includes("mern") 
      );
    })
    .map((job) => ValidateJobIsPostedWithinSetDays(job))
    .filter(Boolean)
    .sort((a: any, b: any) => b.createdDate - a.createdDate);
}
