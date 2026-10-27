import { ConfirmChannel, Message } from "amqplib";
import {
  ComposeUrl,
  HttpBasedScrap,
  JOB_FOUND_BASE_URL,
  JOB_FOUND_SEARCH_URL,
  JOB_SEARCH_URL,
  NAUKRI_BASE_URL,
  naukriJDScrap,
} from "../index.js";

export default async function PlatformInitialization(
  workerId: string,
  platform: string,
  channel: ConfirmChannel,
  message: Message,
) {
  if (platform === "naukri") {
    const composedURL = ComposeUrl(
      JOB_SEARCH_URL.path,
      NAUKRI_BASE_URL,
      JOB_SEARCH_URL.query,
    );
    await HttpBasedScrap(workerId, channel, message, composedURL);
  } else if (platform === "jobFound") {
    const composedURL = ComposeUrl(
      JOB_FOUND_SEARCH_URL.path,
      JOB_FOUND_BASE_URL,
      JOB_FOUND_SEARCH_URL.query,
    );

    await HttpBasedScrap(workerId, channel, message, composedURL);
  } else if (platform === "naukri-jd" || platform === "jdScrap") {
    // Playwright JD scraping and Gemini AI resume evaluation
    await naukriJDScrap(undefined, workerId);
    channel.ack(message);
  } else if (platform === "linkedIn") {
    // Scope: LinkedIn scraping support
  } else {
    // Scope: Public platforms support
  }
}
