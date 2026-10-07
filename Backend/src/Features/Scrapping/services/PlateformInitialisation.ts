import { ConfirmChannel, Message } from "amqplib";
import domScrapping from "../../UserInteractions/utility/naukri/DomBasedScrap.js";
import httpScrapping from "../../UserInteractions/utility/naukri/HttpBasedScrap.js";

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
