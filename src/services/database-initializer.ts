import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDatabase } from '../database.js';

const seedUserSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72).refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
  displayName: z.string().trim().min(1).max(80),
});

function readSeedUser(number: 1 | 2) {
  const prefix = `SEED_USER_${number}`;
  const values = {
    email: process.env[`${prefix}_EMAIL`],
    password: process.env[`${prefix}_PASSWORD`],
    displayName: process.env[`${prefix}_DISPLAY_NAME`],
  };

  const parsed = seedUserSchema.safeParse(values);
  if (!parsed.success) {
    throw new Error(`${prefix} environment variables must contain a valid email, password, and display name.`);
  }
  return parsed.data;
}

export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();

  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(254) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(80) NOT NULL,
      bio VARCHAR(280) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY users_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id CHAR(36) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY auth_sessions_user_id_idx (user_id),
      KEY auth_sessions_expires_at_idx (expires_at),
      CONSTRAINT auth_sessions_user_id_fk FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const seedUsers = [readSeedUser(1), readSeedUser(2)];
  const passwordHashes = await Promise.all(seedUsers.map(({ password }) => bcrypt.hash(password, 12)));

  await database.execute(
    `INSERT IGNORE INTO users (email, password_hash, display_name)
     VALUES (?, ?, ?), (?, ?, ?)`,
    [
      seedUsers[0].email,
      passwordHashes[0],
      seedUsers[0].displayName,
      seedUsers[1].email,
      passwordHashes[1],
      seedUsers[1].displayName,
    ],
  );
}