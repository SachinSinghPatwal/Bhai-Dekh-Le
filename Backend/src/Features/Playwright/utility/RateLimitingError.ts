export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly lastPage: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}
