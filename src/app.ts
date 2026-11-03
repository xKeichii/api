import express from 'express';
import cors from 'cors';
import { readFileSync } from 'node:fs';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes/index.js';
import swaggerUi from 'swagger-ui-express';

export const app = express();
const swaggerDocument = JSON.parse(
	readFileSync(new URL('../docs/openapi.json', import.meta.url), 'utf8'),
) as object;

const allowedOrigins = new Set([
	'https://app.54-36-162-208.sslip.io',
	'http://localhost:5173',
]);
app.use(cors({ origin: (origin, callback) => callback(null, origin && allowedOrigins.has(origin) ? origin : false) }));
app.use(express.json());
app.use(requestLogger);
app.use('/api', apiRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(notFoundHandler);
app.use(errorHandler);
