import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import {
  CreatingEnviromentToScrap,
  SETUP_RETURNED_VALUES,
} from "./Playwright/CreatingEnviromentToScrap.js";
import { MAX_RETRIES } from "../constants.js";
import { RateLimitError } from "../utility/RateLimitingError.js";

export default async function Scrapper(
  workerId: string,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let browserInstace;
  let lastPageCrashed = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const { url, request, noOfJobs, headers, jobDetails, browser } =
        (await CreatingEnviromentToScrap()) as SETUP_RETURNED_VALUES;

      browserInstace = browser;

      const orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        noOfJobs,
        retryStartingPage: lastPageCrashed,
        workerId,
        jobDetails,
      });

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
        `\n Worker ${workerId}: Scrapper error. Attempt ${attempt}/${MAX_RETRIES}. Last Pages Crashed ${lastPageCrashed}`,
        error,
      );

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      await retryDelay(attempt);
    }
  }
}

async function retryDelay(retry: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), 10000 * retry));
}
