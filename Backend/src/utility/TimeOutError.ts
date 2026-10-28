export class TimeoutError extends Error {
  constructor(reason:string) {
    super(`Request timed out Reason: ${reason}`);
    this.name = "TimeoutError";
  }
}
