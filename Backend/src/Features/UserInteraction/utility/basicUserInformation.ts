/**
 * Interactive terminal script that builds JOb_SEARCH_URL_WITH_QUERY
 * from user answers.
 *
 * Run with:
 *   npx tsx src/Features/UserInteraction/utility/basicUserInformation.ts
 *
 * Required fields are always asked.
 * Optional query filters (location, experience, etc.) first ask a yes/no
 * boolean so the user is warned that enabling them may reduce the job count.
 */

import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import log from "../../../utility/Logger.js";

/*
 * ─────────────────────────────────────────
 * READLINE SETUP
 * ─────────────────────────────────────────
 */

const rl = createInterface({
  input: stdin,
  output: stdout,
});

/*
 * ─────────────────────────────────────────
 * HELPERS
 * ─────────────────────────────────────────
 */

/** Prompt the user and return a trimmed string. Re-prompts on empty if required. */
async function ask(question: string, required = true): Promise<string> {
  while (true) {
    const answer = (await rl.question(`  ${question} `)).trim();

    if (answer !== "" || !required) {
      return answer;
    }

    console.log("  This field is required, please enter a value.\n");
  }
}

/** Prompt a yes / no boolean gate. Returns true for "y" / "yes". */
async function askBool(question: string): Promise<boolean> {
  while (true) {
    const answer = (await rl.question(`  ${question} [y/n]: `))
      .trim()
      .toLowerCase();

    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;

    console.log("  Please answer y or n.\n");
  }
}

/** Print a section divider with a title. */
function section(title: string) {
  const line = "-".repeat(54);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}`);
}

/*
 * ─────────────────────────────────────────
 * RESULT TYPES
 * ─────────────────────────────────────────
 */

interface QueryConfig {
  keyword: string;
  location?: string;
  experience?: string;
  salary?: string;
  jobType?: string;
  department?: string;
  job_Search_By: string;
}

interface JobSearchConfig {
  protocol: string;
  domain: string;
  generic_Job_Description: string;
  query: QueryConfig;
}

/*
 * ─────────────────────────────────────────
 * MAIN
 * ─────────────────────────────────────────
 */

async function buildJobSearchConfig(): Promise<JobSearchConfig> {
  log.info("\n=======================================================");
  log.info("       Job Search Config Builder For Naukri        ");
  log.info("=======================================================");
  log.info(
    "\nAnswer the questions below to build your JOb_SEARCH_URL_WITH_QUERY.\n" +
      "Press Enter to accept the default shown in [brackets].\n",
  );

  /*
   * REQUIRED: Base URL fields
   */
  section("1 / 3  --  Base URL  (required)");

  const protocol =
    (await ask("Protocol [https://]:", false)) || "https://";

  const domain =
    (await ask("Domain  [www.naukri.com/]:", false)) || "www.naukri.com/";

  const generic_Job_Description =
    (await ask("Job description path  [react-jobs?]:", false)) || "react-jobs?";

  /*
   * REQUIRED: Keyword
   */
  section("2 / 3  --  Required Query Params");

  const rawKeyword = await ask(
    'Job keyword (e.g. "react", "node")  [react]:',
    false,
  );
  const keywordValue = rawKeyword || "react";
  const keyword = `k=${keywordValue}&`;

  /*
   * OPTIONAL Query Params
   */
  section("3 / 3  --  Optional Filters");

  console.log(
    "\n  NOTE: Each filter below is OPTIONAL.\n" +
      "  Adding filters narrows the search and may significantly\n" +
      "  REDUCE the number of jobs returned.\n",
  );

  const query: QueryConfig = {
    keyword,
    job_Search_By: "nignbevent_src=jobsearchDeskGNB&",
  };

  // Location
  const useLocation = await askBool(
    "Filter by location? (may reduce results)",
  );
  if (useLocation) {
    const loc = await ask('Location (e.g. "Bhopal", "Bangalore"):');
    query.location = `l=${encodeURIComponent(loc)}&`;
  }

  // Experience
  const useExperience = await askBool(
    "Filter by experience? (may reduce results)",
  );
  if (useExperience) {
    const exp = await ask('Years of experience (e.g. "1", "2"):');
    query.experience = `experience=${encodeURIComponent(exp)}&`;
  }

  // Salary / CTC
  const useSalary = await askBool(
    "Filter by salary/CTC range? (may reduce results)",
  );
  if (useSalary) {
    console.log(
      "\n  Naukri CTC filter format: <min>to<max>  (e.g. 0to3, 3to6, 6to10)\n",
    );
    const salaryRange = await ask('CTC range (e.g. "0to3"):');
    query.salary = `ctcFilter=${encodeURIComponent(salaryRange)}&`;
  }

  // Job Type
  const useJobType = await askBool(
    "Filter by job type (code number)? (may reduce results)",
  );
  if (useJobType) {
    console.log(
      "\n  Naukri uses numeric codes for job type.\n" +
        "  Check the URL when you filter on naukri.com to find the number.\n",
    );
    const jobType = await ask('Job type code (e.g. "0"):');
    query.jobType = jobType;
  }

  // Department
  const useDepartment = await askBool(
    "Filter by department (functionalArealGrid code)? (may reduce results)",
  );
  if (useDepartment) {
    console.log(
      "\n  Naukri uses numeric codes for department.\n" +
        "  Check the URL when you filter on naukri.com to find the number.\n",
    );
    const department = await ask('Department code (e.g. "5"):');
    query.department = department;
  }

  return {
    protocol,
    domain,
    generic_Job_Description,
    query,
  };
}

/*
 * ─────────────────────────────────────────
 * RUN
 * ─────────────────────────────────────────
 */

const config = await buildJobSearchConfig();

rl.close();

const divider = "-".repeat(54);

console.log(`\n${divider}`);
console.log("  Your JOb_SEARCH_URL_WITH_QUERY config:");
console.log(`${divider}\n`);

console.log(
  "export const JOb_SEARCH_URL_WITH_QUERY = " +
    JSON.stringify(config, null, 2).replace(/"([^"]+)":/g, "$1:") +
    ";",
);

console.log(`\n${divider}`);
console.log("  Copy the block above into src/constants.ts");
console.log(`${divider}\n`);