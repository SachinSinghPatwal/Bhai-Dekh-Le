import { JOB_DETAILS, ValidatingProp } from "../index.js";

export function sortingJobBasedOnCreated(
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
    .map((job) => ValidatingProp(job))
    .filter(Boolean)
    .sort((a: any, b: any) => b.createdDate - a.createdDate);
}

const sortingUnsortedJobBasedOnTimeCreated = sortingJobBasedOnCreated;
export { sortingUnsortedJobBasedOnTimeCreated };
export default sortingJobBasedOnCreated;
