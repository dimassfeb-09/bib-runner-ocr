import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { setFakeRows, clearFakeRows, clearSentMails, getSentMails } from 'src/__tests__/setup';
import { makeOrder } from 'src/__tests__/helpers';
import { POST } from 'src/app/api/check-order/route';

function makePost(body: any): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/check-order'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearFakeRows();
  clearSentMails();
  process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-mock';
  globalThis.fetch = async (url: any) => {
    if (typeof url === 'string' && url.includes('midtrans.com')) {
      return new Response(JSON.stringify({ transaction_status: 'settlement' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(url);
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('POST /api/check-order', () => {
  async function exec(body: any) {
    return POST(await makePost(body));
  }

  test('happy path — returns order info for settled order', async () => {
    setFakeRows('select * from orders where id = $1', [makeOrder({ payment_status: 'settlement' })]);
    const res = await exec({ email: 'buyer@test.com', order_id: 'BIB-123' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.payment_status).toBe('settlement');
    expect(data.download_token).toBeDefined();
  });

  test('400 when email or order_id is missing', async () => {
    const res = await exec({ email: 'buyer@test.com' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Email and order_id are required');
  });

  test('400 when order_id is missing', async () => {
    const res = await exec({ order_id: 'BIB-123' });
    expect(res.status).toBe(400);
  });

  test('404 when order not found', async () => {
    setFakeRows('select * from orders where id = $1', []);
    const res = await exec({ email: 'buyer@test.com', order_id: 'BIB-NONEXIST' });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain('tidak ditemukan');
  });

  test('404 when email does not match order', async () => {
    setFakeRows('select * from orders where id = $1', [makeOrder({ buyer_email: 'other@test.com' })]);
    const res = await exec({ email: 'wrong@test.com', order_id: 'BIB-123' });
    expect(res.status).toBe(404);
  });

  test('trims and lowercases email', async () => {
    setFakeRows('select * from orders where id = $1', [makeOrder({ buyer_email: 'buyer@test.com' })]);
    const res = await exec({ email: '  BUYER@TEST.COM  ', order_id: 'BIB-123' });
    expect(res.status).toBe(200);
  });

  test('syncs pending order — settlement via Midtrans', async () => {
    setFakeRows('select * from orders where id = $1', [makeOrder({ payment_status: 'pending' })]);
    setFakeRows('set payment_status = $1', [makeOrder({ payment_status: 'settlement' })]);
    const res = await exec({ email: 'buyer@test.com', order_id: 'BIB-123' });
    expect(res.status).toBe(200);
    expect((await res.json()).payment_status).toBe('settlement');
  });

  test('syncs pending order — expire via Midtrans', async () => {
    globalThis.fetch = async (url: any) => {
      if (typeof url === 'string' && url.includes('midtrans.com')) {
        return new Response(JSON.stringify({ transaction_status: 'expire' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(url);
    };
    setFakeRows('select * from orders where id = $1', [makeOrder({ payment_status: 'pending' })]);
    setFakeRows('set payment_status = $1', [makeOrder({ payment_status: 'expire' })]);
    const res = await exec({ email: 'buyer@test.com', order_id: 'BIB-123' });
    expect(res.status).toBe(200);
    expect((await res.json()).payment_status).toBe('expire');
  });

  test('idempotent — checking same settled order twice returns same result', async () => {
    setFakeRows('select * from orders where id = $1', [makeOrder({ payment_status: 'settlement' })]);
    const res1 = await exec({ email: 'buyer@test.com', order_id: 'BIB-123' });
    const data1 = await res1.json();

    const res2 = await exec({ email: 'buyer@test.com', order_id: 'BIB-123' });
    const data2 = await res2.json();

    expect(data1.payment_status).toBe('settlement');
    expect(data2.payment_status).toBe('settlement');
    expect(data1.download_token).toBe(data2.download_token);
  });
});
