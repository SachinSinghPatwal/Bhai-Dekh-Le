import { TimeoutError } from "./TimeOutError.js";

export default function timeOut(
  reason: string,
  timeoutMs: number = 25_000,
): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(reason)), timeoutMs),
  );
}

const TimeOut = timeOut;
export { TimeOut };
