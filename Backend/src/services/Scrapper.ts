import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import {
  CreatingEnviromentToScrap,
  SETUP_RETURNED_VALUES,
} from "./Playwright/CreatingEnviromentToScrap.js";
import { DEFAULT_MAX_RETRIES } from "../constants.js";
import { RateLimitError } from "../utility/RateLimitingError.js";

export default async function Scrapper(
  workerId: string,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let browserInstace;
  let lastPageCrashed = 0;
  let customMaxRetries = Number(process.env.WORKER_COUNT ?? 4);
  let orderedJobs;

  while (attempt < customMaxRetries) {
    try {
      const { url, request, totalJobsAvaibles, headers, jobDetails, browser } =
        (await CreatingEnviromentToScrap()) as SETUP_RETURNED_VALUES;

      if (!customMaxRetries)
        customMaxRetries =
          totalJobsAvaibles / Number(process.env.WORKER_COUNT ?? 4);

      browserInstace = browser;

      orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        totalJobsAvaibles,
        retryStartingPage: lastPageCrashed,
        workerId,
        jobDetails,
      });

      browserInstace?.close();
      return orderedJobs as JOB_DETAILS[];
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        lastPageCrashed = error.lastPage;
        console.error(error.message);
        browserInstace?.close();
      }
      console.log("=======x====== Closing Browser ========x=========");

      attempt++;

      browserInstace?.close();

      console.error(
        `\n Worker ${workerId}: Scrapper error. Attempt ${attempt}/${customMaxRetries}. Last Pages Crashed ${lastPageCrashed}`,
        error,
      );

      if (attempt === customMaxRetries) {
        console.log("ordered job",orderedJobs);
        throw error;
      }

      await retryDelay(attempt);
    }
  }
}

async function retryDelay(retry: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), 10000 * retry));
}
