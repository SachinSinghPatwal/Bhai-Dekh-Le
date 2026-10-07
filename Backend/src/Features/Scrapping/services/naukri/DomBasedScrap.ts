
import { JOB_AUTH_URL } from "../../index.js";
import {
  CreatingEnvironmentToScrap,
  SETUP_RETURNED_VALUES,
} from "../CreatingEnviromentToScrap.js";

export default async function domScrapping(
  workerId: string,
  totalNumberOfJobs: number,
) {
  let lastPageCrashed = null;
  let customMaxRetries = { times: 10, changed: false };
  let orderedJobs;

  try {
    const { page } = (await CreatingEnvironmentToScrap({
      navigateTo: JOB_AUTH_URL.path,
      headless: true,
    })) as Pick<SETUP_RETURNED_VALUES, "page">;
  } catch (error) {}
}
