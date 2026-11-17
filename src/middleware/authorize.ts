import {Request, Response, NextFunction} from "express";

type Role = 'admin' | 'user';

export const authorize = (...roles: Role[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if(!req.auth) {
      return res.status(401).json({
        message: 'Unauthorized'
      });
    }

    if(!roles.includes(req.auth.role)) {
      return res.status(403).json({
        message: "Forbidden"
      })
    }

    next();
  }
}