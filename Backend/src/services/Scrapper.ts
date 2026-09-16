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

  while (attempt < customMaxRetries.times) {
    try {
      const { url, request, totalJobsAvaibles, headers, jobDetails, browser } =
        (await CreatingEnviromentToScrap()) as SETUP_RETURNED_VALUES;

      if (!customMaxRetries.changed) {

        customMaxRetries.changed = true; //flag for updated end page
        
        customMaxRetries.times =
          totalJobsAvaibles / Number(process.env.WORKER_COUNT ?? 4);
      }

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
        `\n Worker ${workerId}: Scrapper error. Attempt ${attempt}/${customMaxRetries.times}. Last Pages Crashed ${lastPageCrashed}`,
        error,
      );

      if (attempt === customMaxRetries.times) {
        console.log("ordered job", orderedJobs);
        throw error;
      }

      await retryDelay(attempt);
    }
  }
}

async function retryDelay(retry: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), 10000 * retry));
}
