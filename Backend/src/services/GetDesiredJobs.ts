import { JOB_DETAILS } from "../models/Mongo/job.models.js";
import { RequestParams } from "../types.js";
import ScrappingPaginatedJob from "../helpers/ScrappingPaginatedJob.js";
import { sortingUnsortedJobBasedOnTimeCreated } from "../utility/sortingJobBasedOnCreated.js";

export default async function getDesiredJobs({
  url,
  request,
  headers,
  noOfJobs,
  jobDetails,
}: RequestParams) {
  const unSortedJobs: JOB_DETAILS[] = [];
  const numberOfJobPerPage = 20;
  let maxPages = Math.ceil((noOfJobs as number)/ numberOfJobPerPage);

  /*
    Intial request interception provide body and no of total jobs exist
  */ 
  if(Array.isArray(jobDetails) && jobDetails.length > 0){
    unSortedJobs.push(...jobDetails);
  }

  const pageUrl: URL = new URL(url.toString());

  // Start from 2nd page since first page is pushed above
  for (let pageNumber = 2; pageNumber <= maxPages; pageNumber++) {
    try {
      await ScrappingPaginatedJob({
        url: pageUrl,
        headers,
        request,
        unSortedJobs,
        pageNumber,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Scraping stopped at page ${pageNumber}:`, error);
        throw error;
      }
    }
  }

  const filteredRecentJob = sortingUnsortedJobBasedOnTimeCreated(unSortedJobs);

  console.log(filteredRecentJob.length);

  return filteredRecentJob as JOB_DETAILS[];
}
