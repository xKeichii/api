import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config.js';
import { findActiveSessionRole, type UserRole } from '../services/auth.service.js';
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
  let tokenRole: UserRole;
  try {
    const payload = jwt.verify(match[1], getConfig().jwtSecret, { algorithms: ['HS256'] });
    if (
      typeof payload === 'string'
      || typeof payload.sub !== 'string'
      || typeof payload.jti !== 'string'
      || (payload.role !== 'user' && payload.role !== 'admin')
    ) {
      throw new HttpError(401, 'Token jest nieprawidłowy.');
    }
    userId = payload.sub;
    sessionId = payload.jti;
    tokenRole = payload.role;
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Token jest nieprawidłowy lub wygasł.'));
    return;
  }

  const role = await findActiveSessionRole(userId, sessionId);
  if (!role) {
    next(new HttpError(401, 'Sesja wygasła lub została wylogowana.'));
    return;
  }
  if (role !== tokenRole) {
    next(new HttpError(401, 'Rola konta uległa zmianie. Zaloguj się ponownie.'));
    return;
  }

  request.auth = { userId, sessionId, role: tokenRole };
  next();
};