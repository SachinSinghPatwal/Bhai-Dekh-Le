import log from "./Logger.js";

export default async function AsyncHandlerContentWrapper(fn: Function, req:object):Promise<Response> {
  try {
    const response = await fn(req);
    return response;
  } catch (error: unknown) {
    log.error("AsyncHandlerContentWrapper caught error:", error);
    throw error;
  }
}
