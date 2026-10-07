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
 * UI CONSTANTS & HELPERS
 * ─────────────────────────────────────────
 */

const UI_WIDTH = 60;

// ANSI escape helpers
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

/** Strip ANSI escape sequences to get the visible text length. */
function visibleLength(text: string): number {
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** Center `text` within `width` characters (ANSI-aware). */
function centerText(text: string, width: number = UI_WIDTH): string {
  const visible = visibleLength(text);
  if (visible >= width) return text;
  const padLeft = Math.floor((width - visible) / 2);
  return " ".repeat(padLeft) + text;
}

/** A horizontal line spanning UI_WIDTH. */
function divider(char = "─"): string {
  return char.repeat(UI_WIDTH);
}

/** Boxed heading (top border, centered title, bottom border). */
function heading(title: string): void {
  const inner = UI_WIDTH - 2;
  const styledTitle = `${BOLD}${CYAN}${title}${RESET}`;
  const centered = centerText(styledTitle, inner);
  const padRight = inner - visibleLength(centered);
  console.log(`\n┌${"─".repeat(inner)}┐`);
  console.log(`│${centered}${" ".repeat(Math.max(0, padRight))}│`);
  console.log(`└${"─".repeat(inner)}┘`);
}

/** Section separator with step counter and subtitle. */
function section(step: string, title: string, subtitle?: string): void {
  console.log(`\n${DIM}${divider()}${RESET}`);
  console.log(centerText(`${DIM}${step}${RESET}`));
  console.log(centerText(`${BOLD}${title}${RESET}`));
  if (subtitle) {
    console.log(centerText(`${DIM}${subtitle}${RESET}`));
  }
  console.log(`${DIM}${divider()}${RESET}\n`);
}

/** Styled note block. */
function note(lines: string[]): void {
  console.log(`  ${BOLD}${YELLOW}NOTE:${RESET} ${lines[0]}`);
  for (let i = 1; i < lines.length; i++) {
    console.log(`        ${lines[i]}`);
  }
  console.log();
}

/** Styled warning/hint block. */
function warning(lines: string[]): void {
  console.log(`  ${BOLD}${YELLOW}⚠${RESET}  ${lines[0]}`);
  for (let i = 1; i < lines.length; i++) {
    console.log(`     ${lines[i]}`);
  }
  console.log();
}

/** Styled success block. */
function success(text: string): void {
  console.log(`  ${GREEN}✓${RESET} ${text}`);
}

/*
 * ─────────────────────────────────────────
 * PROMPT HELPERS
 * ─────────────────────────────────────────
 */

/** Prompt the user and return a trimmed string. Re-prompts on empty if required. */
async function ask(question: string, required = true): Promise<string> {
  while (true) {
    const answer = (await rl.question(`  › ${question} `)).trim();

    if (answer !== "" || !required) {
      return answer;
    }

    console.log(`  ${RED}✗${RESET} This field is required. Please enter a value.\n`);
  }
}

/** Prompt a yes / no boolean gate. Returns true for "y" / "yes". */
async function askBool(question: string): Promise<boolean> {
  while (true) {
    const answer = (await rl.question(`  › ${question} ${DIM}[y/n]:${RESET} `))
      .trim()
      .toLowerCase();

    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;

    console.log(`  ${YELLOW}⚠${RESET} Please answer ${BOLD}y${RESET} or ${BOLD}n${RESET}.\n`);
  }
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

/*
 * ─────────────────────────────────────────
 * MAIN
 * ─────────────────────────────────────────
 */

async function buildJobSearchConfig(): Promise<QueryConfig> {
  heading("JOB SEARCH BUILDER");

    note([
      "Answer the questions below to build your job search configuration.",
      `Press ${BOLD}${YELLOW}Enter${RESET} to accept the default shown in ${CYAN}[brackets]${RESET}.`,
    ]);

  /*
   * REQUIRED: Keyword
   */
  section("1 / 2", "REQUIRED QUERY PARAMS", "Search keyword");

  const rawKeyword = await ask(
    `Job keyword (e.g. react, node) Default-${CYAN}[react]${RESET}:`,
    false,
  );
  const keywordValue = rawKeyword || "react";
  const keyword = `k=${keywordValue}&`;

  /*
   * OPTIONAL Query Params
   */
  section("2 / 2", "OPTIONAL FILTERS", "Narrow your search");

  note([
    "Each filter below is optional.",
    "Adding filters narrows the search and may",
    `${RED}"MIGHT" significantly reduce${RESET} the number of jobs returned.`,
  ]);

  const query: QueryConfig = {
    keyword,
    job_Search_By: "nignbevent_src=jobsearchDeskGNB&",
  };

  // Location
  const useLocation = await askBool("Filter by location? (may reduce results)");
  if (useLocation) {
    const loc = await ask('Location (e.g. "Delhi"):');
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
    warning([
      `Naukri CTC filter format: ${BOLD}<min>to<max>${RESET}  (e.g. 0to3, 3to6, 6to10)`,
    ]);
    const salaryRange = await ask('CTC range (e.g. "0to3"):');
    query.salary = `ctcFilter=${encodeURIComponent(salaryRange)}&`;
  }
  return query
}

/*
 * ─────────────────────────────────────────
 * RUN
 * ─────────────────────────────────────────
 */

const config = await buildJobSearchConfig();

rl.close();

console.log("consfig" , config)

console.log(`\n${divider()}`);
console.log(centerText(`${BOLD}${GREEN}CONFIGURATION READY${RESET}`));
console.log(`${divider()}\n`);

console.log(`  Your ${BOLD}JOb_SEARCH_URL_WITH_QUERY${RESET} config:\n`);

console.log(
  "export const JOb_SEARCH_URL_WITH_QUERY = " +
    JSON.stringify(config, null, 2).replace(/"([^"]+)":/g, "$1:") +
    ";",
);

console.log();
success("Copy the block above into src/constants.ts");
console.log(`\n${divider()}\n`);