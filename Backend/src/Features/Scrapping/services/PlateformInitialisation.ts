import { ConfirmChannel, Message } from "amqplib";
import domScrapping from "./naukri/DomBasedScrap.js";
import httpScrapping from "./naukri/HttpBasedScrap.js";

export default async function PlateformInitialisation(
  workerId: string,
  totalNumberOfJobs: number,
  plateform: string,
  type: string,
  channel: ConfirmChannel,
  message: Message,
) {
  if (plateform === "naukri") {
    /**
     * @privatePlateform
     * */
    if (type === "DOM") {
      await domScrapping(workerId, totalNumberOfJobs);
    } else {
      await httpScrapping(workerId, totalNumberOfJobs, channel, message);
    }
  } else if (plateform === "linkdin") {
  } else {
    /**
     * @publicPlateforms
     * */
  }
}
