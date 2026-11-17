import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMigrationFilename, splitMigrationStatements } from './database-migrations.js';

test('parses numbered migration filenames', () => {
  assert.deepEqual(parseMigrationFilename('002_roles.sql'), {
    version: '002',
    filename: '002_roles.sql',
  });
});

test('rejects migration filenames without a numeric version and name', () => {
  assert.throws(() => parseMigrationFilename('roles.sql'), /Invalid migration filename/);
});

test('splits migration SQL into non-empty statements', () => {
  assert.deepEqual(splitMigrationStatements(' CREATE TABLE users (id INT); \n ALTER TABLE users ADD role INT; '), [
    'CREATE TABLE users (id INT)',
    'ALTER TABLE users ADD role INT',
  ]);
});
