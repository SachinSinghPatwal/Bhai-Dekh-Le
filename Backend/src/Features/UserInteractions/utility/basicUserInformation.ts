import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PERSONAL_DETAILS_PATH, Logger } from "../index.js";

const log = Logger;

/*
 * ─────────────────────────────────────────
 * TYPES
 * ─────────────────────────────────────────
 */

export interface UserResumeProfile {
  personalDetails: {
    fullName: string;
    email: string;
    phone?: string;
    resumePath?: string;
    resumeLink?: string;
  };
  jobDetails: {
    role: string;
    experience: string;
    location?: string;
    workMode?: string;
    noticePeriod?: string;
  };
  skills: {
    primary: string[];
    secondary: string[];
  };
  searchPreferences: {
    keywords: string[];
    platforms: string[];
  };
  createdAt: string;
  updatedAt: string;
}

/*
 * ─────────────────────────────────────────
 * UI CONSTANTS & HELPERS
 * ─────────────────────────────────────────
 */

const UI_WIDTH = 64;

// ANSI escape helpers
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function visibleLength(text: string): number {
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function centerText(text: string, width: number = UI_WIDTH): string {
  const visible = visibleLength(text);
  if (visible >= width) return text;
  const padLeft = Math.floor((width - visible) / 2);
  return " ".repeat(padLeft) + text;
}

function divider(char = "─"): string {
  return char.repeat(UI_WIDTH);
}

function heading(title: string): void {
  const inner = UI_WIDTH - 2;
  const styledTitle = `${BOLD}${CYAN}${title}${RESET}`;
  const centered = centerText(styledTitle, inner);
  const padRight = inner - visibleLength(centered);
  console.log(`\n┌${"─".repeat(inner)}┐`);
  console.log(`│${centered}${" ".repeat(Math.max(0, padRight))}│`);
  console.log(`└${"─".repeat(inner)}┘`);
}

function section(step: string, title: string, subtitle?: string): void {
  console.log(`\n${DIM}${divider()}${RESET}`);
  console.log(centerText(`${DIM}${step}${RESET}`));
  console.log(centerText(`${BOLD}${title}${RESET}`));
  if (subtitle) {
    console.log(centerText(`${DIM}${subtitle}${RESET}`));
  }
  console.log(`${DIM}${divider()}${RESET}\n`);
}

function note(lines: string[]): void {
  console.log(`  ${BOLD}${YELLOW}NOTE:${RESET} ${lines[0]}`);
  for (let i = 1; i < lines.length; i++) {
    console.log(`        ${lines[i]}`);
  }
  console.log();
}

/*
 * ─────────────────────────────────────────
 * INTERACTIVE QUESTIONNAIRE
 * ─────────────────────────────────────────
 */

async function promptUserProfile(): Promise<UserResumeProfile> {
  const rl = createInterface({
    input: stdin,
    terminal: false,
  });

  const ask = async (question: string, defaultValue = "", required = true): Promise<string> => {
    while (true) {
      stdout.write(`  › ${question} `);
      const answer = await new Promise<string>((resolve) => {
        rl.once("line", (line) => resolve(line.trim()));
      });

      if (answer !== "") return answer;
      if (defaultValue) return defaultValue;
      if (!required) return "";

      console.log(`  ${RED}✗${RESET} This field is required. Please provide a value.`);
    }
  };

  try {
    heading("RESUME & JOB PROFILE SETUP");
    note([
      "Welcome! This one-time setup collects your job details, skills, and preferences.",
      `Saved locally without encryption to: ${CYAN}data/personalDetails.personal.json${RESET}`,
    ]);

    // 1. Personal Details
    section("STEP 1 / 4", "PERSONAL INFORMATION", "Identity and Contact");
    note([
      "For local / non-deployed versions, keep your resume file inside the 'data/' directory (e.g. data/resume.pdf).",
    ]);
    const defaultEmail = process.env.NAUKRI_EMAIL ?? "user@example.com";
    const fullName = await ask("Full Name:", process.env.NAUKRI_NAME ?? "Job Seeker", true);
    const email = await ask("Email Address:", defaultEmail, true);
    const phone = await ask("Phone Number (optional):", "", false);

    // 2. Role and Experience
    section("STEP 2 / 4", "TARGET CAREER & EXPERIENCE", "What positions are you seeking?");
    const role = await ask("Target Role / Job Title:", "React Developer", true);
    const experience = await ask("Years of Experience (e.g. 2, 3-5, Fresher):", "2 Years", true);
    const location = await ask("Preferred Location (optional, e.g. Bangalore, Remote):", "", false);
    const workMode = await ask("Preferred Work Mode (e.g. Remote, Hybrid, On-site):", "Remote / Hybrid", false);
    const noticePeriod = await ask("Notice Period (e.g. Immediate, 15 days, 30 days):", "Immediate", false);

    // 3. Skills
    section("STEP 3 / 4", "SKILLS INVENTORY", "Core technical proficiencies");
    const primarySkillsInput = await ask(
      "Primary Skills (comma-separated):",
      "React, JavaScript, TypeScript, Next.js",
      true,
    );
    const secondarySkillsInput = await ask(
      "Secondary / Other Skills (comma-separated, optional):",
      "Node.js, Express, MongoDB, Tailwind CSS, Git",
      false,
    );

    const primarySkills = primarySkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const secondarySkills = secondarySkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // 4. Search Keywords & Platforms
    section("STEP 4 / 4", "SEARCH KEYWORDS & PLATFORMS", "Job discovery settings");
    const keywordsInput = await ask(
      "Keywords usually searched for (comma-separated):",
      "react developer, frontend engineer, full stack developer",
      true,
    );
    const platformsInput = await ask(
      "Target Platforms (comma-separated):",
      "naukri, linkedin",
      true,
    );

    const keywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const platforms = platformsInput
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    const now = getISTDateFormatted();

    const profile: UserResumeProfile = {
      personalDetails: {
        fullName,
        email,
        phone: phone || undefined,
        resumePath: "data/resume.pdf",
      },
      jobDetails: {
        role,
        experience,
        location: location || undefined,
        workMode: workMode || undefined,
        noticePeriod: noticePeriod || undefined,
      },
      skills: {
        primary: primarySkills,
        secondary: secondarySkills,
      },
      searchPreferences: {
        keywords,
        platforms,
      },
      createdAt: now,
      updatedAt: now,
    };

    return profile;
  } finally {
    rl.close();
  }
}

/**
 * Formats date in Indian Standard Time (IST) as yyyy-mm-dd-hh(12hr)
 * Example: "2026-10-09-05pm"
 */
export function getISTDateFormatted(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const period = (map.dayPeriod ?? "").toLowerCase();

  return `${map.year}-${map.month}-${map.day}-${map.hour}${period}`;
}

/*
 * ─────────────────────────────────────────
 * ENVIRONMENT & DEFAULTS
 * ─────────────────────────────────────────
 */

/**
 * Determines whether the process is running in development mode
 * where interactive CLI prompts are permitted.
 *
 * User interaction is disabled if:
 * 1. NODE_ENV is 'production', 'deployment', 'staging', or 'prod'
 * 2. DEPLOYMENT_MODE, DEPLOYMENT, or CI environment variables are 'true'
 * 3. stdin is not a TTY (no interactive terminal attached)
 */
export function isDevelopmentMode(): boolean {
  const env = (process.env.NODE_ENV || "").trim().toLowerCase();
  if (env === "production" || env === "deployment" || env === "staging" || env === "prod") {
    return false;
  }
  if (
    process.env.DEPLOYMENT_MODE === "true" ||
    process.env.DEPLOYMENT === "true" ||
    process.env.CI === "true"
  ) {
    return false;
  }
  // User interaction via stdin requires an interactive terminal
  if (!stdin.isTTY) {
    return false;
  }
  return true;
}

/**
 * Generates a default profile from environment variables or fallback values.
 * Used during non-interactive / deployment mode to prevent hanging on CLI prompts.
 */
export function getDefaultUserProfile(): UserResumeProfile {
  const defaultEmail = process.env.NAUKRI_EMAIL ?? "user@example.com";
  const fullName = process.env.NAUKRI_NAME ?? "Job Seeker";
  const now = getISTDateFormatted();

  return {
    personalDetails: {
      fullName,
      email: defaultEmail,
      resumePath: "data/resume.pdf",
    },
    jobDetails: {
      role: process.env.TARGET_ROLE ?? "React Developer",
      experience: process.env.TARGET_EXPERIENCE ?? "2 Years",
      location: process.env.TARGET_LOCATION,
      workMode: "Remote / Hybrid",
      noticePeriod: "Immediate",
    },
    skills: {
      primary: ["React", "JavaScript", "TypeScript", "Next.js"],
      secondary: ["Node.js", "Express", "MongoDB", "Tailwind CSS", "Git"],
    },
    searchPreferences: {
      keywords: ["react developer", "frontend engineer", "full stack developer"],
      platforms: ["naukri", "linkedin"],
    },
    createdAt: now,
    updatedAt: now,
  };
}

/*
 * ─────────────────────────────────────────
 * MAIN EXPORT
 * ─────────────────────────────────────────
 */

/**
 * Ensures user personal details and resume profile exists before the server starts.
 *
 * - If `data/personalDetails.personal.json` already exists:
 *   Loads the existing profile immediately.
 * - If it does not exist and running in DEVELOPMENT mode (interactive terminal):
 *   Interactively queries the user via the terminal questionnaire.
 * - If it does not exist and running in DEPLOYMENT / non-interactive mode:
 *   Creates a default profile using environment variables without prompting.
 *
 * @param options.force - If true, re-generates profile even if the file exists
 * @param options.interactive - Explicitly control whether to run interactive prompts
 */
export async function ensureBasicUserInformation(options?: {
  force?: boolean;
  interactive?: boolean;
}): Promise<UserResumeProfile> {
  const filePath = PERSONAL_DETAILS_PATH;

  // 1. Check if profile already exists
  if (!options?.force && existsSync(filePath)) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const profile = JSON.parse(content) as UserResumeProfile;
      return profile;
    } catch (readErr) {
      log.warn(`[User Profile] Existing profile at ${filePath} is unreadable. Recreating... (${readErr})`);
    }
  }

  // 2. Determine whether interactive CLI prompts are allowed
  const allowInteraction = options?.interactive ?? isDevelopmentMode();

  if (!allowInteraction) {
    log.info(
      `[User Profile] Deployment / non-interactive mode active (NODE_ENV="${process.env.NODE_ENV || "development"}", isTTY=${Boolean(stdin.isTTY)}). Skipping terminal questionnaire.`,
    );

    const fallbackProfile = getDefaultUserProfile();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(fallbackProfile, null, 2), "utf-8");
    log.info(`[User Profile] Initialized default user profile at ${filePath}`);
    return fallbackProfile;
  }

  // 3. In development mode with TTY: interactively prompt the user
  const profile = await promptUserProfile();

  // 4. Write unencrypted JSON to data/personalDetails.personal.json
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(profile, null, 2), "utf-8");

  console.log(`\n${divider()}`);
  console.log(centerText(`${BOLD}${GREEN}PERSONAL DETAILS PROFILE SAVED${RESET}`));
  console.log(`${divider()}\n`);
  console.log(`  File Location: ${CYAN}${filePath}${RESET} (unencrypted)\n`);

  return profile;
}

export default ensureBasicUserInformation;