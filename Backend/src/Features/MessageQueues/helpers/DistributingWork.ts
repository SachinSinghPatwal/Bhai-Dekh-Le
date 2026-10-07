import {
  CreatingEnvironmentToScrap,
  SETUP_RETURNED_VALUES,
} from "../../Scrapping/services/CreatingEnvironmentToScrap.js";
import ComposeUrl from "../../Scrapping/utility/ComposeUrl.js";
import { JOB_SEARCH_URL } from "../../../constants.js";

export default async function DistributingLoadWithWorkers(
  prevtotalNumberOfJobs: number,
  workerId: string,
) {
  /*
   * Final Check on the Total pages from consumer to self
   */
  const { totalJobsAvailable: currenttotalNumberOfJobs } =
    (await CreatingEnvironmentToScrap({
      navigateTo: ComposeUrl(JOB_SEARCH_URL.path, JOB_SEARCH_URL.query),
      headless: true,
      browserShutdownStatus: "kill",
    })) as Pick<SETUP_RETURNED_VALUES, "totalJobsAvailable">;
  const totalJobsAvaibles = Math.max(
    prevtotalNumberOfJobs,
    currenttotalNumberOfJobs,
  );

  const jobsPerPage = 20;
  const totalPages = Math.ceil(totalJobsAvaibles / jobsPerPage) - 1; // page 1 already fetched
  const totalWorkers = Number(process.env.SCRAP_WORKER_COUNT);

  const workerNumber = Number(workerId.split("-")[1]);

  const basePages = Math.floor(totalPages / totalWorkers);
  const remainder = totalPages % totalWorkers;

  const pagesForThisWorker = basePages + (workerNumber <= remainder ? 1 : 0);

  const startPage =
    2 + (workerNumber - 1) * basePages + Math.min(workerNumber - 1, remainder);

  const endPage = startPage + pagesForThisWorker - 1;

  return { startPage, endPage };
}
