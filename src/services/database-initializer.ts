import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { runMigrations } from './database-migrations.js';

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
  await runMigrations(database);

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