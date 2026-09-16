export default function DistributingLoadWithWorkers(
  totalJobsAvaibles: number,
  workerId: string,
) {
  const totalPages = totalJobsAvaibles - 1; // page 1 already fetched
  const totalWorkers = 4;

  const workerNumber = Number(workerId.split("-")[1]);

  const basePages = Math.floor(totalPages / totalWorkers);
  const remainder = totalPages % totalWorkers;

  const pagesForThisWorker = basePages + (workerNumber <= remainder ? 1 : 0);

  const startPage =
    2 + (workerNumber - 1) * basePages + Math.min(workerNumber - 1, remainder);

  const endPage = startPage + pagesForThisWorker - 1;

  return { startPage, endPage };
}
