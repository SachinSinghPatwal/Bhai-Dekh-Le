import amqp from "amqplib";

import log from "../../../../utility/Logger.js";
import {
  CreatingEnvironmentToScrap,
  SETUP_RETURNED_VALUES,
} from "../../../Scrapping/services/CreatingEnvironmentToScrap.js";
import ComposeUrl from "../../../Scrapping/utility/ComposeUrl.js";
import { JOB_SEARCH_URL, ScheduleScrape } from "../../../../constants.js";

export default async function ScheduleScrapping(): Promise<void> {
  const platform = "naukri";
  const type = process.env.SCRAP_TYPE!;
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL_WITH_CREDENTIALS!,
  );

  try {
    log.success("Producer connected to RabbitMQ");

    const channel = await connection.createConfirmChannel();

    await channel.assertExchange(ScheduleScrape, "direct", {
      durable: true,
      autoDelete: false,
    });

    const workerCount = Number(process.env.SCRAP_WORKER_COUNT ?? 4);

    let totalJobsAvailable: number | undefined;

    if (type !== "DOM") {
      const env = (await CreatingEnvironmentToScrap({
        navigateTo: ComposeUrl(JOB_SEARCH_URL.path, JOB_SEARCH_URL.query),
        headless: true,
        browserShutdownStatus: "kill",
      })) as Pick<SETUP_RETURNED_VALUES, "totalJobsAvailable">;
      totalJobsAvailable = env?.totalJobsAvailable;
    }

    for (let i = 0; i < workerCount; i++) {
      channel.publish(
        ScheduleScrape,
        "Scrapper",
        Buffer.from(
          JSON.stringify(
            type == "DOM"
              ? { type, platform }
              : { type, platform, totalJobsAvailable },
          ),
        ),
        {
          persistent: true,
        },
      );
    }

    await channel.waitForConfirms();

    log.success(`${workerCount} messages published and confirmed`);

    await channel.close();
  } finally {
    await connection.close();

    log.info("Producer connection closed");
  }
}
