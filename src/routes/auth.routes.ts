import { Router } from 'express';
import { getProfile, login, logout, patchProfile, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', requireAuth, logout);
authRouter.get('/me', requireAuth, getProfile);
authRouter.patch('/me', requireAuth, patchProfile);