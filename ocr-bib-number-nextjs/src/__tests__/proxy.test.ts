import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { proxy } from 'src/proxy';

function makeRequest(path: string, hasSession: boolean): NextRequest {
  const url = new URL(path, 'http://localhost:3000');
  const req = new NextRequest(url);
  if (hasSession) {
    req.cookies.set('admin_session', JSON.stringify({ id: 1, username: 'admin' }));
  }
  return req;
}

describe('proxy middleware', () => {
  test('allows authenticated access to /admin', async () => {
    const req = makeRequest('/admin', true);
    const res = await proxy(req);
    expect(res.status).toBe(200); // NextResponse.next()
  });

  test('redirects unauthenticated to /admin/login', async () => {
    const req = makeRequest('/admin', false);
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toEndWith('/admin/login');
  });

  test('redirects unauthenticated on /admin/events', async () => {
    const req = makeRequest('/admin/events', false);
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toEndWith('/admin/login');
  });

  test('allows access to /admin/login without session', async () => {
    const req = makeRequest('/admin/login', false);
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  test('redirects authenticated user away from /admin/login to /admin', async () => {
    const req = makeRequest('/admin/login', true);
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('http://localhost:3000/admin');
  });

  test('passes through non-admin paths', async () => {
    const req = makeRequest('/', false);
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  test('passes through /search path', async () => {
    const req = makeRequest('/search?event_id=1', false);
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });
});
