import { describe, expect, test, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { POST } from 'src/app/api/admin/login/route';

function makePost(body: any): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/admin/login'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(clearFakeRows);

describe('POST /api/admin/login', () => {
  async function exec(body: any) {
    return POST(await makePost(body));
  }

  test('happy path — valid credentials returns success and sets cookie', async () => {
    const { hashPassword } = await import('src/lib/auth');
    const hash = hashPassword('admin123');
    setFakeRows('from admins where username', [{ id: 1, username: 'admin', password_hash: hash }]);

    const res = await exec({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c: string) => c.startsWith('admin_session='))).toBe(true);
  });

  test('401 when username is wrong', async () => {
    setFakeRows('from admins where username', []);
    const res = await exec({ username: 'nonexist', password: 'admin123' });
    expect(res.status).toBe(401);
  });

  test('401 when password is wrong', async () => {
    const { hashPassword } = await import('src/lib/auth');
    const hash = hashPassword('realpass');
    setFakeRows('from admins where username', [{ id: 1, username: 'admin', password_hash: hash }]);

    const res = await exec({ username: 'admin', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('400 when username or password is missing', async () => {
    const res = await exec({ username: 'admin' });
    expect(res.status).toBe(400);
  });

  test('400 when both missing', async () => {
    const res = await exec({});
    expect(res.status).toBe(400);
  });
});
