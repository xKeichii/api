import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes/index.js';

export const app = express();

const allowedOrigins = new Set([
	'https://app.54-36-162-208.sslip.io',
	'http://localhost:5173',
]);
app.use(cors({ origin: (origin, callback) => callback(null, origin && allowedOrigins.has(origin) ? origin : false) }));
app.use(express.json());
app.use(requestLogger);
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
