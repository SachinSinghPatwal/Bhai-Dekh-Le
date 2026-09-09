import { Request } from "express";

export default async function asyncHandlerContentWrapper(fn: Function, req:object):Promise<Response> {
  try {
    const response = await fn(req);
    return response;
  } catch (error: unknown) {
    console.error(error);
    throw error;
  }
}
