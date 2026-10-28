export default async function DistributingWork(
  totalJobsAvailable: number,
  _workerId?: string,
) {
  const jobsPerPage = 20;
  const totalPages = Math.ceil((totalJobsAvailable || 0) / jobsPerPage);
  const startPage = 2;
  const endPage = Math.max(startPage, totalPages + 1);

  return { startPage, endPage };
}

const DistributingLoadWithWorkers = DistributingWork;
export { DistributingLoadWithWorkers };
