import { TimeOut } from "../../index.js";

export default function RaceForResponseOrTimeOut<T>(
  process: Promise<T>,
): Promise<T> {
  return Promise.race([process, TimeOut()]);
}
