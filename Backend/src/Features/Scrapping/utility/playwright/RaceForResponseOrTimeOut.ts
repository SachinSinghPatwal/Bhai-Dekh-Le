import { TimeOut } from "../../index.js";

export default function RaceForResponseOrTimeOut<T>(
  process: Promise<T>,
  reason:string
): Promise<T> {
  return Promise.race([process, TimeOut(reason)]);
}
