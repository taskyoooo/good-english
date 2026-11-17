import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createRegistrationHandler } from '../server/registration';

test('HTTP registration never grants admin, including first, forged-role and later accounts', async () => {
  const users: Array<Record<string, unknown>> = [];
  const handler = createRegistrationHandler({
    queryOne: (async (sql: string, params: unknown[] = []) => {
      if (sql.includes('COUNT')) throw new Error('Public registration must not count users');
      return users.find(user => sql.includes('email =') ? user.email === params[0] : user.id === params[0]);
    }) as any,
    execute: async (_sql, params) => {
      const [id, email, name, password_hash, role] = params;
      users.push({ id, email, name, password_hash, role });
    },
    createSession: async (res, id) => { res.cookie('test_session', id, { httpOnly: true }); },
    hashPassword: () => 'hashed-test-password',
    mapUser: (row: any) => ({ id: row.id, email: row.email, name: row.name, role: row.role }),
  });
  const app = express();
  app.use(express.json());
  app.post('/api/auth/register', (req, res, next) => { handler(req, res).catch(next); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const address = server.address() as { port: number };
  const register = (body: unknown) => fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  try {
    for (const [i, extra] of [{}, { role: 'admin', isAdmin: true }, {}].entries()) {
      const response = await register({ email: `learner${i}@example.com`, name: 'admin', password: 'test-password-only', ...extra });
      assert.equal(response.status, 201);
      assert.equal((await response.json()).user.role, 'student');
      assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/);
      assert.equal(users[i].role, 'student');
    }
    assert.equal((await register({ email: 'learner0@example.com', name: 'repeat', password: 'test-password-only' })).status, 409);
    assert.equal((await register({ email: 'bad-email', name: 'invalid', password: 'short' })).status, 400);
    assert.equal(users.length, 3);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
