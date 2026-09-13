import { type Request } from "playwright";
import GetAllJobs from "../utility/Fetch.js";
import { setIterativePaginationParams } from "../helpers/Playwright/setIterativePagiantionParams.js";
import ValidateJobIsPostedWithinThreeDays from "../utility/ValidatingProp.js";
import { JOB_DETAILS } from "../types.js";

export interface RequestParams {
  url: URL;
  request: Request;
  headers: Record<string, string>;
}

export default async function getDesiredJobs({
  url,
  request,
  headers,
}: RequestParams) {
  const unSortedJobs: JOB_DETAILS[] = [];

  const MAX_PAGES = 40;

  try {
    // First captured request
    const firstPage = await GetAllJobs({
      url,
      headers,
      request,
    });

    const { jobDetails, noOfJobs } = firstPage as {
      jobDetails: JOB_DETAILS[];
      noOfJobs: number;
    };

    unSortedJobs.push(...jobDetails);

    // Remaining pages
    for (let pageNumber = 2; pageNumber <= MAX_PAGES; pageNumber++) {
      const pageUrl = new URL(url.toString());

      setIterativePaginationParams(pageUrl, pageNumber);

      const { jobDetails: pageJobs } = (await GetAllJobs({
        url: pageUrl,
        headers,
        request,
      })) as {
        jobDetails: JOB_DETAILS[];
      };

      unSortedJobs.push(...pageJobs);

      console.log(
        `Fetched page ${pageNumber}, total jobs: ${unSortedJobs.length}`,
      );
    }

    const filteredRecentJob = unSortedJobs
      .filter((job) => {
        const title = String(job.title ?? "").toLowerCase();

        return title.includes("react") || title.includes("javascript");
      })
      .map((job) => ValidateJobIsPostedWithinThreeDays(job))
      .filter(Boolean);

    console.log("Desired jobs:", filteredRecentJob.length);
    console.log(
      "Desired jobs:",
      filteredRecentJob.map((each) => {
        return {
          [each?.title as string]: new Date(each?.createdDate as number).toLocaleString(
            "en-IN",
            {
              timeZone: "Asia/Kolkata",
            },
          ),
        };
      }),
    );

    console.log(
      "Total pages:",
      MAX_PAGES,
      "Total jobs reported:",
      noOfJobs,
      "Total jobs fetched:",
      unSortedJobs.length,
    );

    return filteredRecentJob as JOB_DETAILS[];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Job scraping failed:", error);
      throw error;
    }

    throw new Error("Unknown error while fetching jobs");
  }
}
