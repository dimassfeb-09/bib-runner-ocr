import { describe, expect, test, beforeEach } from 'bun:test';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { makeOrder } from 'src/__tests__/helpers';
import {
  createOrder,
  getOrderById,
  getOrderByToken,
  getOrderWithPhotosByToken,
  updatePaymentStatus,
  getRecentTransactions,
  getAllTransactions,
  getDashboardStats,
  validateDownload,
  getOrdersByEmail,
  getOrderWithPhotosByOrderId,
} from 'src/services/orderService';

beforeEach(clearFakeRows);

describe('createOrder', () => {
  test('creates order and returns it', async () => {
    setFakeRows('insert into orders', [makeOrder()]);
    setFakeRows('insert into order_items', []);
    const order = await createOrder('BIB-123', 'buyer@test.com', 50000, [1, 2]);
    expect(order.id).toBeTruthy();
    expect(order.payment_status).toBe('pending');
  });
});

describe('getOrderById', () => {
  test('returns order when found', async () => {
    setFakeRows('select * from orders where id = $1', [makeOrder()]);
    const order = await getOrderById('BIB-123');
    expect(order).not.toBeNull();
    expect(order!.buyer_email).toBe('buyer@test.com');
  });

  test('returns null when not found', async () => {
    setFakeRows('select * from orders where id = $1', []);
    expect(await getOrderById('BIB-NONEXIST')).toBeNull();
  });
});

describe('getOrderByToken', () => {
  test('returns order by download token', async () => {
    setFakeRows('where download_token = $1 limit 1', [makeOrder()]);
    const order = await getOrderByToken('token-uuid');
    expect(order).not.toBeNull();
  });

  test('returns null for invalid token', async () => {
    setFakeRows('where download_token = $1 limit 1', []);
    expect(await getOrderByToken('bogus')).toBeNull();
  });
});

describe('getOrderWithPhotosByToken', () => {
  test('returns order with photos', async () => {
    setFakeRows('where download_token = $1 limit 1', [makeOrder()]);
    setFakeRows('from order_items oi join photos p on oi.photo_id = p.id', [{ id: 1, watermark_url: 'url' }]);
    const result = await getOrderWithPhotosByToken('token-uuid');
    expect(result).not.toBeNull();
    expect(result!.photos).toHaveLength(1);
  });
});

describe('updatePaymentStatus', () => {
  test('updates status to settlement', async () => {
    setFakeRows('update orders set payment_status = $1', [makeOrder({ payment_status: 'settlement' })]);
    const order = await updatePaymentStatus('BIB-123', 'settlement');
    expect(order!.payment_status).toBe('settlement');
  });

  test('updates status to expire', async () => {
    setFakeRows('update orders set payment_status = $1', [makeOrder({ payment_status: 'expire' })]);
    const order = await updatePaymentStatus('BIB-123', 'expire');
    expect(order!.payment_status).toBe('expire');
  });

  test('returns null for non-existent order', async () => {
    setFakeRows('update orders set payment_status = $1', []);
    expect(await updatePaymentStatus('BIB-NONEXIST', 'settlement')).toBeNull();
  });
});

describe('getRecentTransactions', () => {
  test('returns recent transactions with limit', async () => {
    setFakeRows('from orders order by created_at desc limit $1', [
      makeOrder(),
      makeOrder({ id: 'BIB-456' }),
    ]);
    const result = await getRecentTransactions(2);
    expect(result).toHaveLength(2);
  });
});

describe('getAllTransactions', () => {
  test('returns all transactions with photo_ids', async () => {
    setFakeRows('string_agg(oi.photo_id::text', [
      { id: 'BIB-1', buyer_email: 'a@b.com', payment_status: 'settlement', total_amount: '50000', download_token: 'tok', created_at: new Date(), photo_ids: '1, 2' },
    ]);
    const result = await getAllTransactions();
    expect(result).toHaveLength(1);
  });
});

describe('getDashboardStats', () => {
  test('returns zero stats when no data', async () => {
    setFakeRows('sum(total_amount)', [{ total: null }]);
    setFakeRows('count(*)', [{ total: '0' }]);
    const stats = await getDashboardStats();
    expect(stats.totalRevenue).toBe(0);
    expect(stats.totalPhotosSold).toBe(0);
    expect(stats.totalEvents).toBe(0);
    expect(stats.totalPhotos).toBe(0);
  });

  test('returns correct stats', async () => {
    setFakeRows('sum(total_amount)', [{ total: '500000' }]);
    setFakeRows('count(*)', [{ total: '42' }]);
    const stats = await getDashboardStats();
    expect(stats.totalRevenue).toBe(500000);
    expect(stats.totalPhotosSold).toBe(42);
    expect(stats.totalEvents).toBe(42);
    expect(stats.totalPhotos).toBe(42);
  });
});

describe('validateDownload', () => {
  test('returns validation data when token+photo match', async () => {
    setFakeRows('where o.download_token = $1 and oi.photo_id = $2 limit 1', [{ payment_status: 'settlement', original_url: 'events/1/photo.jpg' }]);
    const result = await validateDownload('token-uuid', 1);
    expect(result).not.toBeNull();
    expect(result!.payment_status).toBe('settlement');
  });

  test('returns null when no match', async () => {
    setFakeRows('where o.download_token = $1 and oi.photo_id = $2 limit 1', []);
    expect(await validateDownload('bogus', 999)).toBeNull();
  });
});

describe('getOrdersByEmail', () => {
  test('returns orders for email', async () => {
    setFakeRows('where buyer_email = $1 order by', [makeOrder()]);
    const orders = await getOrdersByEmail('buyer@test.com');
    expect(orders).toHaveLength(1);
  });

  test('returns empty for unknown email', async () => {
    setFakeRows('where buyer_email = $1 order by', []);
    expect(await getOrdersByEmail('unknown@test.com')).toEqual([]);
  });
});

describe('getOrderWithPhotosByOrderId', () => {
  test('returns order with full photo details', async () => {
    setFakeRows('select * from orders where id = $1', [makeOrder()]);
    setFakeRows('from order_items oi join photos p on oi.photo_id = p.id where oi.order_id = $1', [{ id: 1, watermark_url: 'wm.jpg', original_url: 'orig.jpg' }]);
    const result = await getOrderWithPhotosByOrderId('BIB-123');
    expect(result).not.toBeNull();
    expect(result!.photos).toHaveLength(1);
    expect(result!.photos[0].original_url).toBe('orig.jpg');
  });
});
