import log from "../../../../utility/Logger.js";

export default async function responseValidation(response: Response) {
  if (response.status === 429) {
    throw new Error("Rate Limited - 429 Too Many Requests");
  } else if (response.headers.get("content-type")?.includes("text/html")) {
    const text = await response.text();
    log.debug(`[Fetch] BODY START: ${text.slice(0, 500)}`);
    throw new Error(
      "Received HTML instead of JSON. Possible Rate Limit or Block.",
    );
  }
}
