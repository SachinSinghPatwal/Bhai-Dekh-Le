import { Page } from "playwright";
import { interceptingBrowsersHttpCommunication } from "../../index.js";

type CaptureEvent = "request" | "response";

export default function CapturingEvents<T>(
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

const eventCapturing = CapturingEvents;
export { eventCapturing };
