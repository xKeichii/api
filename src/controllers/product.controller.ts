import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  createProduct as insertProduct,
  deleteProduct as removeProduct,
  getProduct as findProduct,
  listProducts as findProducts,
  updateProduct as saveProduct,
} from '../services/product.service.js';
import { HttpError } from '../utils/http-error.js';

const productFields = {
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000),
  price: z.number().finite().min(0).max(99_999_999.99)
    .refine((value) => Number(value.toFixed(2)) === value, 'Cena może mieć maksymalnie dwa miejsca po przecinku.'),
  quantity: z.number().int().min(0).max(4_294_967_295),
};

export const createProductSchema = z.object(productFields).strict();
export const updateProductSchema = z.object(productFields).strict();
export const productIdSchema = z.string()
  .regex(/^[1-9]\d{0,19}$/)
  .refine((value) => /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 18_446_744_073_709_551_615n);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(2_147_483_647).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listProducts: RequestHandler = async (request, response) => {
  const { page, limit } = paginationSchema.parse(request.query);
  response.status(200).json(await findProducts(page, limit));
};

export const getProduct: RequestHandler = async (request, response) => {
  const id = productIdSchema.parse(request.params.id);
  const item = await findProduct(id);
  if (!item) {
    throw new HttpError(404, 'Nie znaleziono produktu.');
  }
  response.status(200).json({ item });
};

export const createProduct: RequestHandler = async (request, response) => {
  const input = createProductSchema.parse(request.body);
  const item = await insertProduct(input);
  response.status(201).json({ item });
};

export const updateProduct: RequestHandler = async (request, response) => {
  const id = productIdSchema.parse(request.params.id);
  const input = updateProductSchema.parse(request.body);
  const item = await saveProduct(id, input);
  if (!item) {
    throw new HttpError(404, 'Nie znaleziono produktu.');
  }
  response.status(200).json({ item });
};

export const deleteProduct: RequestHandler = async (request, response) => {
  const id = productIdSchema.parse(request.params.id);
  if (!(await removeProduct(id))) {
    throw new HttpError(404, 'Nie znaleziono produktu.');
  }
  response.status(204).end();
};
