import { ConfirmChannel, Message } from "amqplib";
import httpScrapping from "./naukri/HttpBasedScrap.js";

export default async function PlatformInitialization(
  workerId: string,
  totalNumberOfJobs: number,
  platform: string,
  channel: ConfirmChannel,
  message: Message,
) {
  if (platform === "naukri") {
    // HTTP-based scraping with automated session authentication
    await httpScrapping(workerId, totalNumberOfJobs, channel, message);
  } else if (platform === "linkedIn") {
    // Scope: LinkedIn scraping support
  } else {
    // Scope: Public platforms support
  }
}
