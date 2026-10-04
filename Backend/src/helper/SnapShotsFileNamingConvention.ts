export function getSnapShotFileName(
  jobsAmount: number,
): Record<string, string> {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
  const fileName = `${hours}-${minutes}-${seconds}-${milliseconds}_Jobs_Scrapped_Count-${jobsAmount}.json`;

  const dateFolder = `${day}-${month}-${year}`;

  return { dateFolder, fileName };
}
