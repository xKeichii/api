import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
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
}

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
    'SELECT id, email, display_name, bio, password_hash FROM users WHERE email = ?',
    [email],
  );
  return rows[0];
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
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = jwt.sign(
    { sub: user.id, jti: sessionId },
    getConfig().jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  await getDatabase().execute('DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP()');
  await getDatabase().execute(
    'INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    [sessionId, user.id, expiresAt],
  );

  return { token, expiresAt: expiresAt.toISOString(), user: toProfile(user) };
}

export async function findActiveSession(userId: string, sessionId: string): Promise<boolean> {
  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    'SELECT id FROM auth_sessions WHERE id = ? AND user_id = ? AND expires_at > UTC_TIMESTAMP()',
    [sessionId, userId],
  );
  return rows.length > 0;
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  await getDatabase().execute('DELETE FROM auth_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
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