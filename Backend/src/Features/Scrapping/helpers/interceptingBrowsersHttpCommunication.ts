import { type Page, type Request, type Response } from "playwright";
import { MatchedURLOfSearch } from "../../../constants.js";

type CommunicationMap = {
  request: Request;
  response: Response;
};

export function interceptingBrowsersHttpCommunication<
  E extends keyof CommunicationMap,
>(page: Page, resolve: (value: CommunicationMap[E]) => void, event: E) {
  const handler = (param: CommunicationMap[E]) => {
    if (!param.url().includes(MatchedURLOfSearch)) {
      return;
    }

    page.off(event as any, handler as any);

    resolve(param);
  };

  return handler;
}
