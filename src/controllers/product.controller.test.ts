import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { app } from '../app.js';
import {
  createProductSchema,
  paginationSchema,
  productIdSchema,
  productListQuerySchema,
  updateProductSchema,
} from './product.controller.js';

const validProduct = {
  name: 'Coffee',
  description: 'Whole bean coffee',
  price: 12.5,
  quantity: 10,
};

describe('product request validation', () => {
  it('accepts product fields while keeping the added date server-managed', () => {
    assert.equal(createProductSchema.safeParse(validProduct).success, true);
    assert.equal(createProductSchema.safeParse({ ...validProduct, addedAt: '2026-01-01' }).success, false);
  });

  it('rejects invalid price precision and negative quantity', () => {
    assert.equal(createProductSchema.safeParse({ ...validProduct, price: 12.555 }).success, false);
    assert.equal(updateProductSchema.safeParse({ ...validProduct, quantity: -1 }).success, false);
  });

  it('applies pagination defaults and rejects invalid page values', () => {
    assert.deepEqual(paginationSchema.parse({}), { page: 1, limit: 20 });
    assert.equal(paginationSchema.safeParse({ page: '0' }).success, false);
    assert.equal(paginationSchema.safeParse({ limit: '101' }).success, false);
  });

  it('applies sorting defaults and accepts only supported sort fields and directions', () => {
    assert.deepEqual(productListQuerySchema.parse({}), {
      page: 1,
      limit: 20,
      sortBy: 'addedAt',
      order: 'desc',
    });
    assert.deepEqual(productListQuerySchema.parse({ sortBy: 'price', order: 'asc' }), {
      page: 1,
      limit: 20,
      sortBy: 'price',
      order: 'asc',
    });
    assert.equal(productListQuerySchema.safeParse({ sortBy: 'unknown' }).success, false);
    assert.equal(productListQuerySchema.safeParse({ order: 'sideways' }).success, false);
  });

  it('validates product filters and rejects an inverted price range', () => {
    assert.deepEqual(productListQuerySchema.parse({
      minPrice: '10.50',
      maxPrice: '50',
      search: '  coffee  ',
      availability: 'available',
    }), {
      page: 1,
      limit: 20,
      sortBy: 'addedAt',
      order: 'desc',
      minPrice: 10.5,
      maxPrice: 50,
      search: 'coffee',
      availability: 'available',
    });
    assert.equal(productListQuerySchema.safeParse({ minPrice: '50', maxPrice: '10' }).success, false);
    assert.equal(productListQuerySchema.safeParse({ availability: 'in-stock' }).success, false);
    assert.equal(productListQuerySchema.safeParse({ search: '   ' }).success, false);
  });

  it('accepts only positive unsigned 64-bit product IDs', () => {
    assert.equal(productIdSchema.safeParse('42').success, true);
    assert.equal(productIdSchema.safeParse('0').success, false);
    assert.equal(productIdSchema.safeParse('18446744073709551616').success, false);
  });

  it('keeps product reads public and requires authentication for writes', async () => {
    const invalidPage = await request(app).get('/api/products?page=0');
    const invalidId = await request(app).get('/api/products/not-an-id');
    const create = await request(app).post('/api/products').send(validProduct);

    assert.equal(invalidPage.status, 400);
    assert.equal(invalidId.status, 400);
    assert.equal(create.status, 401);
  });
});
