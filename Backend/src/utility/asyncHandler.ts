import { Request, Response, NextFunction } from "express";

export interface RequestHandler {
  (req: Request, res: Response, next: NextFunction): void | Promise<void>;
}

export const AsyncHandler = (requestHandler: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

