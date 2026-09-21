import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import {
  CreatingEnviromentToScrap,
  SETUP_RETURNED_VALUES,
} from "./Playwright/CreatingEnviromentToScrap.js";
import { RateLimitError } from "../utility/RateLimitingError.js";

export default async function Scrapper(
  workerId: string,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let browserInstace;
  let lastPageCrashed = 0;
  let customMaxRetries = { times: 10, changed: false };
  let orderedJobs;
  let initialTotalJobs = 0;

  while (attempt < customMaxRetries.times) {
    try {
      const { url, request, totalJobsAvaibles, headers, jobDetails, browser } =
        (await CreatingEnviromentToScrap()) as SETUP_RETURNED_VALUES;

      if (initialTotalJobs === 0) {
        initialTotalJobs = totalJobsAvaibles;
      }

      if (!customMaxRetries.changed) {
        customMaxRetries.changed = true; //flag for updated end page

        customMaxRetries.times =
          initialTotalJobs / Number(process.env.SCRAP_WORKER_COUNT ?? 4);
      }

      browserInstace = browser;

      orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        totalJobsAvaibles: initialTotalJobs,
        retryStartingPage: lastPageCrashed,
        workerId,
        jobDetails,
      });

      await browserInstace?.close();
      return orderedJobs as JOB_DETAILS[];
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        lastPageCrashed = error.lastPage;
        console.error(error.message);
      }

      attempt++;

      await browserInstace?.close();
    }
  }
}
