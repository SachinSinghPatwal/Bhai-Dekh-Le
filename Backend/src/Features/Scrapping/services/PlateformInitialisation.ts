import { ConfirmChannel, Message } from "amqplib";
import domScrapping from "./naukri/DomBasedScrap.js";
import httpScrapping from "./naukri/HttpBasedScrap.js";

export default async function PlatformInitialization(
  workerId: string,
  totalNumberOfJobs: number,
  platform: string,
  type: "DOM" | "HTTP",
  channel: ConfirmChannel,
  message: Message,
) {
  if (platform === "naukri") {
    /**
     * @privatePlatform
     * */
    if (type === "DOM") {
      await domScrapping(workerId, totalNumberOfJobs);
      channel.ack(message);
    } else {
      await httpScrapping(workerId, totalNumberOfJobs, channel, message);
    }
  } else if (platform === "linkedIn") {
    
  } else {
    /**
     * @publicPlatforms
     * */
  }
}
