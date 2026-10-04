import {
  CreatingEnviromentToScrap,
  SETUP_RETURNED_VALUES,
} from "../../Playwright/services/CreatingEnviromentToScrap.js";

export default async function DistributingLoadWithWorkers(
  prevtotalNumberOfJobs: number,
  workerId: string,
) {
  /*
   * Final Check on the Total pages from consumer to self
   */
  const { totalJobsAvaibles: currenttotalNumberOfJobs } =
    (await CreatingEnviromentToScrap()) as Pick<
      SETUP_RETURNED_VALUES,
      "totalJobsAvaibles"
    >;
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
