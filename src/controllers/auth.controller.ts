import type { RequestHandler } from 'express';
import { z } from 'zod';
import { getUserProfile, loginUser, registerUser, revokeSession, updateUserProfile } from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';

const emailSchema = z.string().trim().email('Podaj poprawny adres e-mail.').max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków.').max(72).refine(
  (value) => Buffer.byteLength(value, 'utf8') <= 72,
  'Hasło nie może przekraczać 72 bajtów.',
);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(80),
}).strict();

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72) }).strict();

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(280).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Podaj co najmniej jedno pole do zmiany.');

export const register: RequestHandler = async (request, response) => {
  const input = registerSchema.parse(request.body);
  const user = await registerUser(input);
  response.status(201).json({ message: 'Konto zostało utworzone.', user });
};

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  response.status(200).json(await loginUser(input.email, input.password));
};

export const logout: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new HttpError(401, 'Wymagane jest uwierzytelnienie.');
  }
  await revokeSession(request.auth.userId, request.auth.sessionId);
  response.status(200).json({ message: 'Wylogowano pomyślnie.' });
};

export const getProfile: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new HttpError(401, 'Wymagane jest uwierzytelnienie.');
  }
  response.status(200).json({ user: await getUserProfile(request.auth.userId) });
};

export const patchProfile: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new HttpError(401, 'Wymagane jest uwierzytelnienie.');
  }
  const input = profileSchema.parse(request.body);
  response.status(200).json({ user: await updateUserProfile(request.auth.userId, input) });
};