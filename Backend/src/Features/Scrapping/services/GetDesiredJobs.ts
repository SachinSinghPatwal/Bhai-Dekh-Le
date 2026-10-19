import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import { RequestParams } from "../../../types.js";
import ScrappingPaginatedJob from "../helpers/ScrappingPaginatedJob.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";
import fs from "node:fs/promises";
import DistributingLoadWithWorkers from "../../MessageQueues/helpers/DistributingWork.js";
import log from "../../../utility/Logger.js";
import path from "node:path";

export default async function getDesiredJobs({
  url,
  request,
  headers,
  totalJobsAvailable,
  initialbatchOfJobs,
  workerId,
  retryStartingPage,
}: RequestParams): Promise<JOB_DETAILS[]> {
  let initialPage: number = 0;
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

  const jobs = await ScrappingPaginatedJob({
    url: new URL(url.toString()),
    headers,
    request,
    initialPage,
    initialJobs: initialbatchOfJobs,
    workerId,
    endPage,
  });
  const filteredRecentJob = sortingUnsortedJobBasedOnTimeCreated(jobs);
  console.log(
    filteredRecentJob.map(({ title, footerPlaceholderLabel }: any) => ({
      title,
      footerPlaceholderLabel,
    })),
  );
  const snapshotDir = path.resolve(`./snapShots`);

  const entries = await fs.readdir(snapshotDir);
  await Promise.all(
    entries
      .filter((entry) => entry !== ".gitkeep")
      .map((entry) =>
        fs.rm(path.join(snapshotDir, entry), {
          recursive: true,
          force: true,
        }),
      ),
  );

  return filteredRecentJob as JOB_DETAILS[];
}
