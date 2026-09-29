import mysql from 'mysql2/promise';
import { getConfig } from './config.js';

let pool: mysql.Pool | undefined;

export function getDatabase(): mysql.Pool {
  if (!pool) {
    const config = getConfig();
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      supportBigNumbers: true,
      bigNumberStrings: true,
      timezone: 'Z',
    });
  }
  return pool;
}