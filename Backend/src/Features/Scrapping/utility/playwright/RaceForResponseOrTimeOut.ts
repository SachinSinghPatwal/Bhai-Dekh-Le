import TimeOut from "../../../../utility/TimeOut.js";

export default function RaceForResponseOrTimeOut<T>(
  process: Promise<T>,
  reason: string,
  timeoutMs: number = 25_000,
): Promise<T> {
  return Promise.race([process, TimeOut(reason, timeoutMs)]);
}
