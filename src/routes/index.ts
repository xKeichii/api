import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { productRouter } from './product.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productRouter);
