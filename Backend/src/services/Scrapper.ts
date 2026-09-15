import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import {
  CreatingEnviromentToScrap,
  SETUP_RETURNED_VALUES,
} from "./Playwright/CreatingEnviromentToScrap.js";
import { MAX_RETRIES } from "../constants.js";

export default async function Scraper(
  workerId: string,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let browserInstace ;
  while (attempt < MAX_RETRIES) {
    // await retryDelay(attempt)
    try {
      const { url, request, noOfJobs, headers, jobDetails,browser } =
        (await CreatingEnviromentToScrap()) as SETUP_RETURNED_VALUES;

      browserInstace = browser

      const filteredRecentJob = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        noOfJobs,
        workerId,
        jobDetails,
      });

      return filteredRecentJob;
    } catch (error: unknown) {
      browserInstace?.close();
      attempt++;
      console.error(`Worker ${workerId}: Scraper error:`, error);
      if (attempt === MAX_RETRIES) {
        throw error;
      }
    }
  }
}

async function retryDelay(retry: number):Promise<void> {
  return new Promise((_, resolve) => setTimeout(() => resolve(), 10000 * retry));
}
