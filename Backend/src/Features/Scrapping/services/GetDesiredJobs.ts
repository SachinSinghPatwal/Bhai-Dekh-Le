import {
  JOB_DETAILS,
  RequestParams,
  ScrappingPaginatedJob,
  sortingJobBasedOnCreated,
  DistributingWork,
  Logger,
} from "../index.js";
import fs from "node:fs/promises";
import path from "node:path";

import { existsSync } from "node:fs";

export default async function GetDesiredJobs({
  url,
  request,
  headers,
  totalJobsAvailable,
  initialbatchOfJobs,
  workerId,
  retryStartingPage,
  platform = "naukri",
}: RequestParams): Promise<JOB_DETAILS[]> {
  let initialPage: number = 0;
  
  const { startPage: expectedStartPage, endPage } =
    await DistributingWork(totalJobsAvailable as number, workerId);

  if (!retryStartingPage) {
    initialPage = expectedStartPage;
  } else {
    initialPage = retryStartingPage as number;
  }

  Logger.info(
    `[${workerId}] Starting scraping work size: ${endPage - initialPage + 1} pages (from ${initialPage} to ${endPage})`,
  );

  const jobs = await ScrappingPaginatedJob({
    url: new URL(url!.toString()),
    headers,
    request,
    initialPage,
    initialJobs: initialbatchOfJobs as JOB_DETAILS[],
    workerId,
    endPage,
    platform,
  });
  const filteredRecentJob = sortingJobBasedOnCreated(jobs);
  Logger.debug(`[${workerId}] Sorted ${filteredRecentJob.length} recent jobs.`);
  const snapshotDir = path.resolve(`./snapShots`, platform);

  if (existsSync(snapshotDir)) {
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
  }

  return filteredRecentJob as JOB_DETAILS[];
}

const getDesiredJobs = GetDesiredJobs;
export { getDesiredJobs };
