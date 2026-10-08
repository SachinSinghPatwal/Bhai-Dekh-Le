import { Page } from "playwright";
import { interceptingBrowsersHttpCommunication } from "../../helpers/interceptingBrowsersHttpCommunication.js";

type CaptureEvent = "request" | "response";

export default function eventCapturing<T>(
  page: Page,
  capturingOn: CaptureEvent,
): Promise<T> {
  return new Promise<T>((resolve) => {
    (page.on as any)(
      capturingOn,
      interceptingBrowsersHttpCommunication<T>(page, resolve, capturingOn),
    );
  });
}
