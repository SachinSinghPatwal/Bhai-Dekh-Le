export default async function AsyncHandlerContentWrapper(fn: Function, req:object):Promise<Response> {
  try {
    const response = await fn(req);
    return response;
  } catch (error: unknown) {
    console.error(error);
    throw error;
  }
}
