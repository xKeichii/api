import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.use(express.json());
app.use(requestLogger);
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
