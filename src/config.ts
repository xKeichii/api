export interface AppConfig {
  port: number;
  jwtSecret: string;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
}

export function getConfig(): AppConfig {
  const jwtSecret = process.env.JWT_SECRET;
  const databaseHost = process.env.DB_HOST;
  const databaseUser = process.env.DB_USER;
  const databasePassword = process.env.DB_PASSWORD;
  const databaseName = process.env.DB_NAME;
  const port = Number(process.env.PORT ?? 3000);
  const databasePort = Number(process.env.DB_PORT ?? 3306);

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  if (!databaseHost || !databaseUser || !databasePassword || !databaseName) {
    throw new Error('DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME must be configured.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
  }

  return {
    port,
    jwtSecret,
    database: {
      host: databaseHost,
      port: databasePort,
      user: databaseUser,
      password: databasePassword,
      name: databaseName,
    },
  };
}