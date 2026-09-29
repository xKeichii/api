import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { app } from './app.js';

describe('GET /api/health', () => {
  it('returns the API health status', async () => {
    const response = await request(app).get('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(typeof response.body.timestamp, 'string');
  });
});
