class ApiResponse {
  statusCode: number;
  data?: object;
  message: string;
  success: boolean;
  constructor({
    statusCode,
    data,
    message = "Success",
  }: {
    statusCode: number;
    data?: Record<string, unknown>;
    message: string;
  }) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
