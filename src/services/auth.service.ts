import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getConfig } from '../config.js';
import { getDatabase } from '../database.js';
import { HttpError } from '../utils/http-error.js';
import type { UserProfile } from '../types/user.js';

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  display_name: string;
  bio: string;
  password_hash: string;
  role: UserRole;
}

export type UserRole = 'user' | 'admin';

interface ActiveSessionRow extends RowDataPacket {
  role: string;
}

interface RefreshSessionRow extends RowDataPacket {
  id: string;
  user_id: string;
  role: string;
}

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toProfile(user: UserRow): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
  };
}

async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const [rows] = await getDatabase().execute<UserRow[]>(
    'SELECT id, email, display_name, bio, password_hash, role FROM users WHERE email = ?',
    [email],
  );
  return rows[0];
}

function createAccessToken(userId: string, sessionId: string, role: UserRole): string {
  return jwt.sign(
    { sub: userId, jti: sessionId, role },
    getConfig().jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<UserProfile> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const [result] = await getDatabase().execute<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
      [input.email, passwordHash, input.displayName],
    );
    return {
      id: String(result.insertId),
      email: input.email,
      displayName: input.displayName,
      bio: '',
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Konto z tym adresem e-mail już istnieje.');
    }
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Nieprawidłowy adres e-mail lub hasło.');
  }

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const token = createAccessToken(user.id, sessionId, user.role);
  const refreshToken = createRefreshToken();

  await getDatabase().execute('DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP()');
  await getDatabase().execute(
    'INSERT INTO auth_sessions (id, user_id, expires_at, refresh_token_hash) VALUES (?, ?, ?, ?)',
    [sessionId, user.id, refreshExpiresAt, hashRefreshToken(refreshToken)],
  );

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    refreshToken,
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    user: toProfile(user),
  };
}

export async function refreshUserSession(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const [rows] = await getDatabase().execute<RefreshSessionRow[]>(
    `SELECT auth_sessions.id, auth_sessions.user_id, users.role
     FROM auth_sessions
     INNER JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.refresh_token_hash = ?
       AND auth_sessions.expires_at > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  const session = rows[0];
  if (!session) {
    throw new HttpError(401, 'Refresh token jest nieprawidłowy lub wygasł.');
  }
  if (session.role !== 'user' && session.role !== 'admin') {
    throw new Error(`Unsupported user role "${session.role}" in the database.`);
  }

  const nextRefreshToken = createRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const [result] = await getDatabase().execute<ResultSetHeader>(
    `UPDATE auth_sessions
     SET refresh_token_hash = ?, expires_at = ?
     WHERE id = ?
       AND refresh_token_hash = ?
       AND expires_at > UTC_TIMESTAMP()`,
    [hashRefreshToken(nextRefreshToken), refreshExpiresAt, session.id, tokenHash],
  );
  if (result.affectedRows !== 1) {
    throw new HttpError(401, 'Refresh token jest nieprawidłowy lub wygasł.');
  }

  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  return {
    token: createAccessToken(session.user_id, session.id, session.role),
    expiresAt: expiresAt.toISOString(),
    refreshToken: nextRefreshToken,
    refreshExpiresAt: refreshExpiresAt.toISOString(),
  };
}

export async function findActiveSessionRole(userId: string, sessionId: string): Promise<UserRole | null> {
  const [rows] = await getDatabase().execute<ActiveSessionRow[]>(
    `SELECT users.role
     FROM auth_sessions
     INNER JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.id = ?
       AND auth_sessions.user_id = ?
       AND auth_sessions.expires_at > UTC_TIMESTAMP()`,
    [sessionId, userId],
  );
  const role = rows[0]?.role;
  if (role === undefined) {
    return null;
  }
  if (role !== 'user' && role !== 'admin') {
    throw new Error(`Unsupported user role "${role}" in the database.`);
  }
  return role;
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  await getDatabase().execute('DELETE FROM auth_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
}

export async function deleteUserAccount(userId: string, password: string): Promise<void> {
  const [rows] = await getDatabase().execute<UserRow[]>(
    'SELECT id, email, display_name, bio, password_hash FROM users WHERE id = ?',
    [userId],
  );
  const user = rows[0];
  if (!user) {
    throw new HttpError(404, 'Nie znaleziono użytkownika.');
  }
  if (!(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Nieprawidłowe hasło.');
  }

  const [result] = await getDatabase().execute<ResultSetHeader>('DELETE FROM users WHERE id = ?', [userId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Nie znaleziono użytkownika.');
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const [rows] = await getDatabase().execute<UserRow[]>(
    'SELECT id, email, display_name, bio, password_hash FROM users WHERE id = ?',
    [userId],
  );
  const user = rows[0];
  if (!user) {
    throw new HttpError(404, 'Nie znaleziono użytkownika.');
  }
  return toProfile(user);
}

export async function updateUserProfile(
  userId: string,
  updates: { displayName?: string; bio?: string },
): Promise<UserProfile> {
  const fields: string[] = [];
  const values: Array<string> = [];

  if (updates.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(updates.displayName);
  }
  if (updates.bio !== undefined) {
    fields.push('bio = ?');
    values.push(updates.bio);
  }

  if (fields.length > 0) {
    values.push(userId);
    await getDatabase().execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return getUserProfile(userId);
}