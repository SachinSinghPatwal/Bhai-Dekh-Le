import makeHttpRequestToGetAllDesiredJobs from "./GetDesiredJobs.js";
import { JOB_DETAILS } from "../../../models/Mongo/job.models.js";
import {
  CreatingEnviromentToScrap,
  SETUP_RETURNED_VALUES,
} from "./CreatingEnviromentToScrap.js";
import { RateLimitError } from "../utility/RateLimitingError.js";
import log from "../../../utility/Logger.js";

export default async function Scrapper(
  workerId: string,
  totalNumberOfJobs: number,
): Promise<JOB_DETAILS[] | undefined> {
  let attempt = 0;
  let lastPageCrashed = 0;
  let customMaxRetries = { times: 10, changed: false };
  let orderedJobs;
  let initialTotalJobs = 0;

  while (attempt < customMaxRetries.times) {
    try {
      /*
       * Final Check on the Total pages from consumer to self
       */
      const { url, request, headers, totalJobsAvaibles, jobDetails } =
        (await CreatingEnviromentToScrap()) as Required<SETUP_RETURNED_VALUES>;

      if (initialTotalJobs === 0) {
        initialTotalJobs = Math.max(totalJobsAvaibles, totalNumberOfJobs);
      }

      if (!customMaxRetries.changed) {
        customMaxRetries.changed = true; //flag for updated end page

        customMaxRetries.times =
          initialTotalJobs / Number(process.env.SCRAP_WORKER_COUNT ?? 4);
      }

      orderedJobs = await makeHttpRequestToGetAllDesiredJobs({
        url,
        headers,
        request,
        totalJobsAvaibles: initialTotalJobs,
        retryStartingPage: lastPageCrashed,
        workerId,
        jobDetails,
      });
      return orderedJobs as JOB_DETAILS[];
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        lastPageCrashed = error.lastPage;
        log.warn(error.message);
      }

      attempt++;
    }
  }
}
