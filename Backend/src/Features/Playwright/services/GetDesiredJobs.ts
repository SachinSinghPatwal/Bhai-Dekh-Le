import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import ScrappingPaginatedJob from "../helpers/ScrappingPaginatedJob.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";
import DistributingLoadWithWorkers from "../../RabbitMQ/helpers/DistributingWork.js";
import log from "../../../utility/Logger.js";

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

  log.debug(`total Number Of Pages: ${Number(totalJobsAvaibles) / 20 - 1}`);

  let { startPage, endPage } = DistributingLoadWithWorkers(
    totalJobsAvaibles as number,
    workerId,
  );

  if (retryStartingPage > 0) {
    startPage = retryStartingPage; // retrying on previous closed browser
  }

  log.info(
    `[${workerId}] Starting scraping work size: ${endPage - startPage + 1} pages (from ${startPage} to ${endPage})`,
  );

  /*
    Intial request interception provide body and no of total jobs exist
  */
  if (Array.isArray(jobDetails) && jobDetails.length > 0) {
    unSortedJobs.push(...jobDetails);
  }

  try {
    for (let i = startPage; i <= endPage; i++) {
      await ScrappingPaginatedJob({
        url: new URL(url.toString()),
        headers,
        request,
        unSortedJobs, // pushing to this array sequentially is safe
        pageNumber: i,
        workerId,
        endPage,
        startPage,
      });
    }
  } catch (error) {
    log.error(
      `Error while collecting fetched Data from [${workerId}] :`,
      error,
    );
    throw error;
  }

  const filteredRecentJob = sortingUnsortedJobBasedOnTimeCreated(unSortedJobs);

  return filteredRecentJob as JOB_DETAILS[];
}
