import type { RequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';

type Role = 'admin' | 'user';

export const authorize = (...roles: Role[]): RequestHandler => {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new HttpError(401, 'Wymagane jest uwierzytelnienie.'));
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(new HttpError(403, 'Brak wymaganych uprawnień.'));
      return;
    }

    next();
  };
}