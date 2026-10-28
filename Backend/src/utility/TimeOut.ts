import { GENERAL_TIMEOUT } from "../constants.js";
import { TimeoutError } from "./TimeOutError.js";

export default function timeOut(reason:string): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(reason)), GENERAL_TIMEOUT),
  );
}
