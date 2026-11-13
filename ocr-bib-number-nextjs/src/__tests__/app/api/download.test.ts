import { describe, expect, test, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { GET } from 'src/app/api/download/route';

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

beforeEach(clearFakeRows);

describe('GET /api/download', () => {
  test('happy path — returns file for valid token + settled payment', async () => {
    setFakeRows('where o.download_token = $1 and oi.photo_id = $2 limit 1', [{
      payment_status: 'settlement',
      original_url: 'events/1/photo_123.jpg',
    }]);

    const res = await GET(makeRequest('/api/download?token=valid-token&photo_id=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });

  test('400 when token is missing', async () => {
    const res = await GET(makeRequest('/api/download?photo_id=1'));
    expect(res.status).toBe(400);
  });

  test('400 when photo_id is missing', async () => {
    const res = await GET(makeRequest('/api/download?token=valid-token'));
    expect(res.status).toBe(400);
  });

  test('400 when photo_id is not a number', async () => {
    const res = await GET(makeRequest('/api/download?token=tok&photo_id=abc'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid photo_id');
  });

  test('403 when token+photo combination is invalid', async () => {
    setFakeRows('where o.download_token = $1 and oi.photo_id = $2 limit 1', []);
    const res = await GET(makeRequest('/api/download?token=bogus&photo_id=999'));
    expect(res.status).toBe(403);
  });

  test('403 when payment is not settled', async () => {
    setFakeRows('where o.download_token = $1 and oi.photo_id = $2 limit 1', [{
      payment_status: 'pending',
      original_url: 'events/1/photo_123.jpg',
    }]);
    const res = await GET(makeRequest('/api/download?token=valid-token&photo_id=1'));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('not been settled');
  });

  test('returns png content type for png files', async () => {
    setFakeRows('where o.download_token = $1 and oi.photo_id = $2 limit 1', [{
      payment_status: 'settlement',
      original_url: 'events/1/photo_123.png',
    }]);
    const res = await GET(makeRequest('/api/download?token=valid-token&photo_id=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
