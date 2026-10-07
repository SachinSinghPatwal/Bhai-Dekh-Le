import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import ScrappingPaginatedJob from "../helpers/ScrappingPaginatedJob.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";
import DistributingLoadWithWorkers from "../../MessageQueues/helpers/DistributingWork.js";
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
  let initialPage: number = 0;
  /*
    Intial request interception provide body and no of total jobs exist
  */
  if (Array.isArray(jobDetails) && jobDetails.length > 0) {
    unSortedJobs.push(...jobDetails);
  }

  try {
    const { startPage: expectedStartPage, endPage } =
      await DistributingLoadWithWorkers(totalJobsAvaibles as number, workerId);

    if (!retryStartingPage) {
      initialPage = expectedStartPage;
    } else {
      initialPage = retryStartingPage as number;
    }

    log.info(
      `[${workerId}] Starting scraping work size: ${endPage - initialPage + 1} pages (from ${initialPage} to ${endPage})`,
    );

    console.log("going for work");

    for (let i = initialPage; i < endPage; i++) {
      await ScrappingPaginatedJob({
        url: new URL(url.toString()),
        headers,
        request,
        unSortedJobs, // pushing to this array sequentially is safe
        currentPageNumber: i,
        initialPage,
        workerId,
        endPage,
      });
    }
    const filteredRecentJob =
      sortingUnsortedJobBasedOnTimeCreated(unSortedJobs);
    return filteredRecentJob as JOB_DETAILS[];
  } catch (error: unknown) {
    throw error;
  }
}
