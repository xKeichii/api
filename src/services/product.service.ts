import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDatabase } from '../database.js';

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export interface Product extends ProductInput {
  id: string;
  addedAt: string;
}

interface ProductRow extends RowDataPacket {
  id: string;
  name: string;
  description: string;
  price: string;
  added_at: Date | string;
  quantity: number;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

function toProduct(row: ProductRow): Product {
  const addedAt = row.added_at instanceof Date
    ? row.added_at
    : new Date(row.added_at.includes('T') ? row.added_at : `${row.added_at.replace(' ', 'T')}Z`);

  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    price: Number(row.price),
    addedAt: addedAt.toISOString(),
    quantity: row.quantity,
  };
}

const productColumns = 'id, name, description, price, added_at, quantity';

const sortColumns = {
  addedAt: 'added_at',
  name: 'name',
  price: 'price',
  quantity: 'quantity',
} as const;

export type ProductSortBy = keyof typeof sortColumns;
export type ProductSortOrder = 'asc' | 'desc';

export async function listProducts(
  page: number,
  limit: number,
  sortBy: ProductSortBy,
  order: ProductSortOrder,
) {
  const offset = (page - 1) * limit;
  const [rows] = await getDatabase().execute<ProductRow[]>(
    `SELECT ${productColumns}
     FROM products
     ORDER BY ${sortColumns[sortBy]} ${order === 'asc' ? 'ASC' : 'DESC'}, id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  const [countRows] = await getDatabase().execute<CountRow[]>(
    'SELECT COUNT(*) AS total FROM products',
  );

  return {
    items: rows.map(toProduct),
    page,
    limit,
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const [rows] = await getDatabase().execute<ProductRow[]>(
    `SELECT ${productColumns} FROM products WHERE id = ?`,
    [id],
  );
  return rows[0] ? toProduct(rows[0]) : null;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const [result] = await getDatabase().execute<ResultSetHeader>(
    `INSERT INTO products (name, description, price, quantity)
     VALUES (?, ?, ?, ?)`,
    [input.name, input.description, input.price.toFixed(2), input.quantity],
  );
  const product = await getProduct(String(result.insertId));
  if (!product) {
    throw new Error('Created product could not be loaded from the database.');
  }
  return product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product | null> {
  await getDatabase().execute(
    `UPDATE products
     SET name = ?, description = ?, price = ?, quantity = ?
     WHERE id = ?`,
    [input.name, input.description, input.price.toFixed(2), input.quantity, id],
  );
  return getProduct(id);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const [result] = await getDatabase().execute<ResultSetHeader>(
    'DELETE FROM products WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
