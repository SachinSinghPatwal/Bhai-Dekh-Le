export class RateLimitingError extends Error {
  constructor(
    message: string,
    public readonly lastPage: number,
  ) {
    super(message);
    this.name = "RateLimitingError";
  }
}

export const RateLimitError = RateLimitingError;
export default RateLimitingError;
