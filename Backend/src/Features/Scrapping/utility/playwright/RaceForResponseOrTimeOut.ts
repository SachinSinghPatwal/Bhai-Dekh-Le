import timeOut from "../../../../utility/TimeOut.js";

export default function RaceForResponseOrTimeOut<T>(
  process: Promise<T>,
): Promise<T> {
  return Promise.race([process, timeOut()]);
}
