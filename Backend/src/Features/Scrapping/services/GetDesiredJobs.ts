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
  totalJobsAvailable,
  jobDetails,
  workerId,
  retryStartingPage,
}: RequestParams): Promise<JOB_DETAILS[]> {
  let initialPage: number = 0;

  try {
    const { startPage: expectedStartPage, endPage } =
      await DistributingLoadWithWorkers(totalJobsAvailable as number, workerId);

    if (!retryStartingPage) {
      initialPage = expectedStartPage;
    } else {
      initialPage = retryStartingPage as number;
    }

    log.info(
      `[${workerId}] Starting scraping work size: ${endPage - initialPage + 1} pages (from ${initialPage} to ${endPage})`,
    );

    console.log("going for work");

    const jobs = await ScrappingPaginatedJob({
      url: new URL(url.toString()),
      headers,
      request,
      initialPage,
      initialJobs: jobDetails,
      workerId,
      endPage,
    });

    console.log(jobs.length, jobs[jobs.length - 1].footerPlaceholderColor);
    const filteredRecentJob = sortingUnsortedJobBasedOnTimeCreated(jobs);

    return filteredRecentJob as JOB_DETAILS[];
  } catch (error: unknown) {
    throw error;
  }
}
