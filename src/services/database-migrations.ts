import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

const MIGRATION_LOCK_NAME = 'api_schema_migrations';
const MIGRATION_FILENAME_PATTERN = /^(\d+)_([a-z0-9][a-z0-9_-]*)\.sql$/i;
const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../migrations');

interface Migration {
  version: string;
  filename: string;
  statements: string[];
}

interface AppliedMigration extends RowDataPacket {
  version: string;
  name: string;
}

interface LockResult extends RowDataPacket {
  acquired: number | null;
}

export function parseMigrationFilename(filename: string): Pick<Migration, 'version' | 'filename'> {
  const match = MIGRATION_FILENAME_PATTERN.exec(filename);
  if (!match) {
    throw new Error(`Invalid migration filename "${filename}". Expected <number>_<name>.sql.`);
  }

  const numericVersion = Number(match[1]);
  if (!Number.isSafeInteger(numericVersion)) {
    throw new Error(`Migration version in "${filename}" is not a safe integer.`);
  }

  return { version: String(numericVersion).padStart(match[1].length, '0'), filename };
}

export function splitMigrationStatements(sql: string): string[] {
  return sql.split(';').map((statement) => statement.trim()).filter(Boolean);
}

async function loadMigrations(): Promise<Migration[]> {
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort((left, right) => {
      const leftVersion = Number(parseMigrationFilename(left).version);
      const rightVersion = Number(parseMigrationFilename(right).version);
      return leftVersion - rightVersion;
    });

  const migrations = await Promise.all(filenames.map(async (filename) => {
    const parsed = parseMigrationFilename(filename);
    const statements = splitMigrationStatements(await readFile(resolve(migrationsDirectory, filename), 'utf8'));
    if (statements.length === 0) {
      throw new Error(`Migration "${filename}" is empty.`);
    }
    return { ...parsed, statements };
  }));

  const seenVersions = new Set<string>();
  for (const migration of migrations) {
    if (seenVersions.has(migration.version)) {
      throw new Error(`Duplicate migration version "${migration.version}".`);
    }
    seenVersions.add(migration.version);
  }

  return migrations;
}

async function applyMigration(connection: PoolConnection, migration: Migration): Promise<void> {
  await connection.beginTransaction();
  try {
    for (const statement of migration.statements) {
      await connection.query(statement);
    }
    await connection.execute(
      'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
      [migration.version, migration.filename],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export async function runMigrations(database: Pool): Promise<void> {
  const migrations = await loadMigrations();
  const connection = await database.getConnection();
  let lockAcquired = false;

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(32) NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (version)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [lockRows] = await connection.execute<LockResult[]>(
      'SELECT GET_LOCK(?, 60) AS acquired',
      [MIGRATION_LOCK_NAME],
    );
    if (lockRows[0]?.acquired !== 1) {
      throw new Error('Could not acquire the database migration lock within 60 seconds.');
    }
    lockAcquired = true;

    const [appliedRows] = await connection.execute<AppliedMigration[]>(
      'SELECT version, name FROM schema_migrations',
    );
    const appliedMigrations = new Map(appliedRows.map(({ version, name }) => [version, name]));

    for (const [version, filename] of appliedMigrations) {
      const migration = migrations.find((candidate) => candidate.version === version);
      if (!migration || migration.filename !== filename) {
        throw new Error(`Applied migration "${filename}" is missing or has been renamed.`);
      }
    }

    for (const migration of migrations) {
      if (!appliedMigrations.has(migration.version)) {
        await applyMigration(connection, migration);
        console.log(`Applied database migration ${migration.filename}`);
      }
    }
  } finally {
    try {
      if (lockAcquired) {
        await connection.execute('SELECT RELEASE_LOCK(?)', [MIGRATION_LOCK_NAME]);
      }
    } finally {
      connection.release();
    }
  }
}
