import { Page,Request,Response } from "playwright";
import { interceptingBrowsersHttpCommunication } from "../../helpers/interceptingBrowsersHttpCommunication.js";

export default  function eventCaptured(page: Page): {
  capturedRequest: Promise<Request>;
  capturedResponse: Promise<Response>;
} {
  const capturedRequest = new Promise<Request>((resolve) => {
    page.on(
      "request",
      interceptingBrowsersHttpCommunication(page, resolve as any, "request"),
    );
  });

  const capturedResponse = new Promise<Response>((resolve) => {
    page.on(
      "response",
      interceptingBrowsersHttpCommunication(page, resolve as any, "response"),
    );
  });

  return { capturedRequest, capturedResponse };
}
