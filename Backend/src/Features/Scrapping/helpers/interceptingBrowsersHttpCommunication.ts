// interceptingBrowsersHttpCommunication.ts

import { Page, Request, Response } from "playwright";
import { MatchedURLOfSearch } from "../../../constants.js";

type Communication = Request | Response;

export function interceptingBrowsersHttpCommunication<T>(
  page: Page,
  resolve: (value: T) => void,
  event: "request" | "response",
) {
  const handler = (param: Communication) => {
    if (!param.url().includes(MatchedURLOfSearch)) {
      return;
    }

    (page.off as any)(event, handler);

    resolve(param as T);
  };

  return handler;
}
