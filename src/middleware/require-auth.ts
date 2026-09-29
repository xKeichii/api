import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config.js';
import { findActiveSession } from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const authorization = request.header('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    next(new HttpError(401, 'Wymagany jest token Bearer.'));
    return;
  }

  let userId: string;
  let sessionId: string;
  try {
    const payload = jwt.verify(match[1], getConfig().jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
      throw new HttpError(401, 'Token jest nieprawidłowy.');
    }
    userId = payload.sub;
    sessionId = payload.jti;
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Token jest nieprawidłowy lub wygasł.'));
    return;
  }

  if (!(await findActiveSession(userId, sessionId))) {
    next(new HttpError(401, 'Sesja wygasła lub została wylogowana.'));
    return;
  }

  request.auth = { userId, sessionId };
  next();
};