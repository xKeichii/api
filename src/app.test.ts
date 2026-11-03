import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { app } from './app.js';

test('Swagger UI serves the API documentation', async () => {
	const response = await request(app).get('/api-docs/');

	assert.equal(response.status, 200);
	assert.match(response.text, /swagger-ui/);
});
