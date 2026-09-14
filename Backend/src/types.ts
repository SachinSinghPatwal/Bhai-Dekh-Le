import { Request } from "playwright";

export interface RequestParams {
  url: URL;
  request: Request;
  headers: Record<string, string>;
}
