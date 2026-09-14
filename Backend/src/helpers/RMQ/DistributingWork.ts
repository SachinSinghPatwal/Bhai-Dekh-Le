export default function DistributingLoadWithWorkers(noOfJobs:number,workerId:string) {
  const numberOfJobPerPage = 20;
  const workers = 4;
  let maxPages = Math.ceil(noOfJobs / numberOfJobPerPage);
  const totalPages = maxPages - 1; // page 1 already fetched
  const workerNumber = Number(workerId.split("-")[1]);
  const pagesPerWorker = Math.ceil(totalPages / workers);
  const startPage = 2 + (workerNumber - 1) * pagesPerWorker;
  const endPage = Math.min(startPage + pagesPerWorker - 1, maxPages);

  return { startPage, endPage };
}
