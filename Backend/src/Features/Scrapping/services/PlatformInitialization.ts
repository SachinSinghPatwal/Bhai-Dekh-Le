import { ConfirmChannel, Message } from "amqplib";
import { HttpBasedScrap, naukriJDScrap } from "../index.js";
import JobFoundHttpBasedScrap from "./jobFound/HttpBasedScrap.js";

export default async function PlatformInitialization(
  workerId: string,
  platform: string,
  channel: ConfirmChannel,
  message: Message,
) {
  if (platform === "naukri") {
    // HTTP-based scraping with automated session authentication
    await HttpBasedScrap(workerId, channel, message);
  } else if (platform === "jobFound") {
    // HTTP-based scraping for JobFound
    await JobFoundHttpBasedScrap(workerId, channel, message);
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
