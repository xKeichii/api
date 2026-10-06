import 'dotenv/config';
import { app } from './app.js';
import { getConfig } from './config.js';
import { initializeDatabase } from './services/database-initializer.js';

async function start(): Promise<void> {
  const { port } = getConfig();
  await initializeDatabase();

  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((error: unknown) => {
  console.error('API startup failed:', error);
  process.exitCode = 1;
});
