import { JOB_AUTH_URL } from "../../../../constants.js";
import ComposeUrl from "../../utility/ComposeUrl.js";
import { CreatingDOMEnvironment } from "../CreatingEnvironmentToScrap.js";
import loginToNaukri from "./naukriAuth/Login.js";

export default async function domScrapping(
  workerId: string,
  totalNumberOfJobs: number,
) {
  try {
    /**
     * Use the lightweight DOM setup — the full HTTP-intercepting environment
     * would timeout on the login page since there is no matching JSON API response.
     * ComposeUrl is required because JOB_AUTH_URL.path is a relative path and
     * page.goto() requires a full URL.
     */
    const page = await CreatingDOMEnvironment({
      navigateTo: ComposeUrl(JOB_AUTH_URL.path),
      headless:false,
    });

    await loginToNaukri(page);
  } catch (error) {
    throw error;
  }
}
