import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import ScrappingPaginatedJob from "../helpers/ScrappingPaginatedJob.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";
import DistributingLoadWithWorkers from "../helpers/RMQ/DistributingWork.js";

export default async function getDesiredJobs({
  url,
  request,
  headers,
  totalJobsAvaibles,
  jobDetails,
  workerId,
  retryStartingPage,
}: RequestParams): Promise<JOB_DETAILS[]> {
  const unSortedJobs: JOB_DETAILS[] = [];

  let { startPage, endPage } = DistributingLoadWithWorkers(
    totalJobsAvaibles as number,
    workerId,
  );

  if (retryStartingPage > 0) {
    startPage = retryStartingPage; // retrying on previous closed browser
  }

  console.log(`[${workerId}] Starting scraping work size: ${endPage - startPage + 1} pages (from ${startPage} to ${endPage})`);

  /*
    Intial request interception provide body and no of total jobs exist
  */
  if (Array.isArray(jobDetails) && jobDetails.length > 0) {
    unSortedJobs.push(...jobDetails);
  }

  try {
    const CONCURRENCY = 5;
    for (let i = startPage; i <= endPage; i += CONCURRENCY) {
      const batch = [];
      for (let j = 0; j < CONCURRENCY && i + j <= endPage; j++) {
        const pageNumber = i + j;
        batch.push(
          ScrappingPaginatedJob({
            url: new URL(url.toString()),
            headers,
            request,
            unSortedJobs, // note: pushing to this array concurrently is safe in JS
            pageNumber,
            workerId,
            endPage,
          })
        );
      }
      await Promise.all(batch);
      // Add a small delay between batches to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    throw error;
  }

  const filteredRecentJob = sortingUnsortedJobBasedOnTimeCreated(unSortedJobs);

  console.log(filteredRecentJob.length);

  return filteredRecentJob as JOB_DETAILS[];
}
