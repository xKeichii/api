import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { app } from './app.js';
import { profileSchema } from './controllers/auth.controller.js';

describe('auth request validation', () => {
  it('rejects malformed registration without contacting the database', async () => {
    const response = await request(app).post('/api/auth/register').send({ email: 'bad', password: 'short' });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /Nieprawidłowe dane/);
  });

  it('requires a bearer token for logout and profile routes', async () => {
    const logout = await request(app).post('/api/auth/logout');
    const profile = await request(app).get('/api/auth/me');

    assert.equal(logout.status, 401);
    assert.equal(profile.status, 401);
  });

  it('does not allow changing the read-only email field', () => {
    assert.equal(profileSchema.safeParse({ email: 'new@example.com' }).success, false);
    assert.equal(profileSchema.safeParse({ displayName: 'Nowa nazwa', bio: 'Opis' }).success, true);
  });
});