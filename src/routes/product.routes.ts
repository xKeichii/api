import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/product.controller.js';

export const productRouter = Router();

productRouter.get('/', listProducts);
productRouter.get('/:id', getProduct);
productRouter.post('/', requireAuth, authorize('admin'), createProduct);
productRouter.put('/:id', requireAuth, authorize('admin'), updateProduct);
productRouter.delete('/:id', requireAuth, authorize('admin'), deleteProduct);
