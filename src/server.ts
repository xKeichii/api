import 'dotenv/config';
import { app } from './app.js';
import { getConfig } from './config.js';

const { port } = getConfig();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
