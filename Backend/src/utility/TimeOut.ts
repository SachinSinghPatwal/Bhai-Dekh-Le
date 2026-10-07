import { GENERAL_TIMEOUT } from "../constants.js";
import { TimeoutError } from "./TimeOutError.js";

export default function timeOut(): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new TimeoutError()),
      GENERAL_TIMEOUT,
    ),
  );
}
