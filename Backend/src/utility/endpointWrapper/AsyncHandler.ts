import { Request, Response, NextFunction } from "express";

export interface RequestHandler {
  (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Response | Promise<Response>;
}

export const AsyncHandler = (requestHandler: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};
