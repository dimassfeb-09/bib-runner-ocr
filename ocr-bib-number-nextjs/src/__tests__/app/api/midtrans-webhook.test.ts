import { describe, expect, test, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { setFakeRows, clearFakeRows, clearSentMails, getSentMails } from 'src/__tests__/setup';
import { makeOrder } from 'src/__tests__/helpers';
import { POST } from 'src/app/api/midtrans-webhook/route';
import crypto from 'crypto';

function makeSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return crypto.createHash('sha512').update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest('hex');
}

function makeWebhook(body: any): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/midtrans-webhook'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const serverKey = 'SB-Mid-server-mock-key-for-testing';

beforeEach(() => {
  clearFakeRows();
  clearSentMails();
  process.env.MIDTRANS_SERVER_KEY = serverKey;
});

describe('POST /api/midtrans-webhook', () => {
  async function exec(body: any) {
    return POST(await makeWebhook(body));
  }

  test('happy path — settlement updates DB and sends email', async () => {
    const sig = makeSignature('BIB-123', '200', '50000', serverKey);
    setFakeRows('set payment_status = $1', [makeOrder({ payment_status: 'settlement', buyer_email: 'buyer@test.com' })]);

    const res = await exec({
      order_id: 'BIB-123', status_code: '200', gross_amount: '50000',
      signature_key: sig, transaction_status: 'settlement',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('settlement');

    const downloadMails = getSentMails().filter((m: any) => m.type === 'download-link');
    expect(downloadMails).toHaveLength(1);
    expect(downloadMails[0].toEmail).toBe('buyer@test.com');
  });

  test('400 when signature is invalid', async () => {
    const res = await exec({
      order_id: 'BIB-123', status_code: '200', gross_amount: '50000',
      signature_key: 'invalid-signature', transaction_status: 'settlement',
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid signature');
  });

  test('maps capture to settlement', async () => {
    const sig = makeSignature('BIB-123', '200', '50000', serverKey);
    setFakeRows('set payment_status = $1', [makeOrder({ payment_status: 'settlement' })]);

    const res = await exec({
      order_id: 'BIB-123', status_code: '200', gross_amount: '50000',
      signature_key: sig, transaction_status: 'capture',
    });

    expect((await res.json()).status).toBe('settlement');
  });

  test('maps deny to deny', async () => {
    const sig = makeSignature('BIB-123', '200', '50000', serverKey);
    setFakeRows('set payment_status = $1', [makeOrder({ payment_status: 'deny' })]);

    const res = await exec({
      order_id: 'BIB-123', status_code: '200', gross_amount: '50000',
      signature_key: sig, transaction_status: 'deny',
    });

    expect((await res.json()).status).toBe('deny');
  });

  test('maps expire to expire', async () => {
    const sig = makeSignature('BIB-123', '200', '50000', serverKey);
    setFakeRows('set payment_status = $1', [makeOrder({ payment_status: 'expire' })]);

    const res = await exec({
      order_id: 'BIB-123', status_code: '200', gross_amount: '50000',
      signature_key: sig, transaction_status: 'expire',
    });

    expect((await res.json()).status).toBe('expire');
  });

  test('404 when order not found in DB', async () => {
    const sig = makeSignature('BIB-NONEXIST', '200', '50000', serverKey);
    setFakeRows('set payment_status = $1', []);

    const res = await exec({
      order_id: 'BIB-NONEXIST', status_code: '200', gross_amount: '50000',
      signature_key: sig, transaction_status: 'settlement',
    });

    expect(res.status).toBe(404);
  });

  test('does not send email on non-settlement status', async () => {
    const sig = makeSignature('BIB-123', '200', '50000', serverKey);
    setFakeRows('set payment_status = $1', [makeOrder({ payment_status: 'deny' })]);

    await exec({
      order_id: 'BIB-123', status_code: '200', gross_amount: '50000',
      signature_key: sig, transaction_status: 'deny',
    });

    expect(getSentMails().filter((m: any) => m.type === 'download-link')).toHaveLength(0);
  });
});
