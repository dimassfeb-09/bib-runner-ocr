import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { setFakeRows, clearFakeRows, clearSentMails, getSentMails } from 'src/__tests__/setup';
import { makeEvent, makePhoto, makeOrder } from 'src/__tests__/helpers';
import { POST } from 'src/app/api/checkout/route';

function makePost(body: any): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/checkout'), {
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
  globalThis.fetch = async (url: any, opts?: any) => {
    if (typeof url === 'string' && url.includes('midtrans')) {
      return new Response(JSON.stringify({ token: 'mock-token', redirect_url: 'https://app.sandbox.midtrans.com/mock' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(url, opts);
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('POST /api/checkout', () => {
  async function exec(body: any) {
    return POST(await makePost(body));
  }

  test('happy path — single photo checkout', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = any($1::int[])', [makePhoto()]);
    setFakeRows('bib_number_id = b.id', []);
    setFakeRows('select distinct pb.photo_id', []);
    setFakeRows('insert into orders', [makeOrder()]);
    setFakeRows('insert into order_items', []);

    const res = await exec({ email: 'buyer@test.com', photo_ids: [1] });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.order_id).toBeDefined();
  });

  test('400 when email is missing', async () => {
    const res = await exec({ photo_ids: [1] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Email and photo_ids are required');
  });

  test('400 when photo_ids is empty array', async () => {
    const res = await exec({ email: 'buyer@test.com', photo_ids: [] });
    expect(res.status).toBe(400);
  });

  test('400 when photo_ids is not an array', async () => {
    const res = await exec({ email: 'buyer@test.com', photo_ids: 'not-array' });
    expect(res.status).toBe(400);
  });

  test('400 when no valid photos found', async () => {
    setFakeRows('where id = any($1::int[])', []);
    const res = await exec({ email: 'buyer@test.com', photo_ids: [999] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('No valid photos found for checkout');
  });

  test('applies bundle discount when buying all photos of a BIB', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = any($1::int[])', [
      makePhoto({ id: 1, price: 50000 }),
      makePhoto({ id: 2, price: 50000 }),
      makePhoto({ id: 3, price: 50000 }),
    ]);
    setFakeRows('bib_number_id = b.id', [
      { photo_id: 1, bib_number: '101', event_id: 1 },
      { photo_id: 2, bib_number: '101', event_id: 1 },
      { photo_id: 3, bib_number: '101', event_id: 1 },
    ]);
    setFakeRows('select distinct pb.photo_id', [{ photo_id: 1 }, { photo_id: 2 }, { photo_id: 3 }]);
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    setFakeRows('where id = $1 limit 1', [makeEvent({ bundle_price: 150000 })]);
    setFakeRows('insert into orders', [makeOrder({ total_amount: 150000 })]);
    setFakeRows('insert into order_items', []);

    const res = await exec({ email: 'buyer@test.com', photo_ids: [1, 2, 3] });
    expect(res.status).toBe(200);
  });

  test('no bundle when BIB has only 1 photo total', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = any($1::int[])', [makePhoto({ id: 1, price: 50000 })]);
    setFakeRows('bib_number_id = b.id', [
      { photo_id: 1, bib_number: '101', event_id: 1 },
    ]);
    setFakeRows('select distinct pb.photo_id', [{ photo_id: 1 }]);
    setFakeRows('insert into orders', [makeOrder({ total_amount: 50000 })]);
    setFakeRows('insert into order_items', []);

    const res = await exec({ email: 'buyer@test.com', photo_ids: [1] });
    expect(res.status).toBe(200);
  });

  test('mixed — two BIBs both bundled, uses event bundle price', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = any($1::int[])', [
      makePhoto({ id: 1, price: 50000 }),
      makePhoto({ id: 2, price: 50000 }),
      makePhoto({ id: 3, price: 50000 }),
      makePhoto({ id: 4, price: 50000 }),
    ]);
    setFakeRows('bib_number_id = b.id', [
      { photo_id: 1, bib_number: '101', event_id: 1 },
      { photo_id: 2, bib_number: '101', event_id: 1 },
      { photo_id: 3, bib_number: '102', event_id: 1 },
      { photo_id: 4, bib_number: '102', event_id: 1 },
    ]);
    setFakeRows('select distinct pb.photo_id', [{ photo_id: 1 }, { photo_id: 2 }]);
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    setFakeRows('where id = $1 limit 1', [makeEvent({ bundle_price: 120000 })]);
    setFakeRows('insert into orders', [makeOrder({ total_amount: 240000 })]);
    setFakeRows('insert into order_items', []);

    const res = await exec({ email: 'buyer@test.com', photo_ids: [1, 2, 3, 4] });
    expect(res.status).toBe(200);
  });

  test('uses custom bib bundle price over event price', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = any($1::int[])', [
      makePhoto({ id: 1, price: 50000 }),
      makePhoto({ id: 2, price: 50000 }),
    ]);
    setFakeRows('bib_number_id = b.id', [
      { photo_id: 1, bib_number: '101', event_id: 1 },
      { photo_id: 2, bib_number: '101', event_id: 1 },
    ]);
    setFakeRows('select distinct pb.photo_id', [{ photo_id: 1 }, { photo_id: 2 }]);
    setFakeRows('select price from bib_numbers where', [{ price: '75000' }]);
    setFakeRows('insert into orders', [makeOrder({ total_amount: 75000 })]);
    setFakeRows('insert into order_items', []);

    const res = await exec({ email: 'buyer@test.com', photo_ids: [1, 2] });
    expect(res.status).toBe(200);
  });

  test('sends payment invoice email', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = any($1::int[])', [makePhoto()]);
    setFakeRows('bib_number_id = b.id', []);
    setFakeRows('select distinct pb.photo_id', []);
    setFakeRows('insert into orders', [makeOrder()]);
    setFakeRows('insert into order_items', []);

    await exec({ email: 'buyer@test.com', photo_ids: [1] });

    const invoiceMails = getSentMails().filter((m: any) => m.type === 'payment-invoice');
    expect(invoiceMails).toHaveLength(1);
    expect(invoiceMails[0].toEmail).toBe('buyer@test.com');
  });
});
