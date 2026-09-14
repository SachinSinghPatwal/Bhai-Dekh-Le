import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import ScrappingPaginatedJob from "../helpers/ScrappingPaginatedJob.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";

export default async function getDesiredJobs({
  url,
  request,
  headers,
}: RequestParams) {
  const unSortedJobs: JOB_DETAILS[] = [];

  let maxPages =112;
  let initialScrap = true;

  const pageUrl:URL = new URL(url.toString());

  // Remaining pages
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    try {
      const pages: number | undefined = await ScrappingPaginatedJob({
        url: pageUrl,
        headers,
        request,
        unSortedJobs,
        initialScrap,
        maxPages,
        pageNumber,
      });
      if (pages && initialScrap) {
        maxPages = pages as number;
      }
      initialScrap = false;
    } catch (error) {
      if(error instanceof Error){
        console.error(`Scraping stopped at page ${pageNumber}:`, error);
        throw error;
      }
    }
  }

  const filteredRecentJob = sortingUnsortedJobBasedOnTimeCreated(unSortedJobs);

  console.log(filteredRecentJob.length);

  return filteredRecentJob as JOB_DETAILS[];
}
