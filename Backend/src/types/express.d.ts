import type { User } from "../models/Mongo/user.models.js";

/**
 * Augments Express's Request so `req.user` is typed everywhere instead of
 * requiring `(req as any).user` casts in each controller.
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
