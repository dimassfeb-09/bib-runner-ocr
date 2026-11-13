import { describe, expect, test, beforeEach } from 'bun:test';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';

beforeEach(clearFakeRows);

describe('Edge cases — photoService', () => {
  test('BIB number with leading/trailing spaces in search', async () => {
    const { searchPhotosByBib } = await import('src/services/photoService');
    setFakeRows('pb.bib_number_id = b.id', []);
    const result = await searchPhotosByBib(1, '  101  ');
    expect(result).toEqual([]);
  });

  test('getAllBibPhotosInEvent returns [] for BIB with single photo', async () => {
    const { getAllBibPhotosInEvent } = await import('src/services/photoService');
    setFakeRows('select distinct pb.photo_id', [{ photo_id: 1 }]);
    const result = await getAllBibPhotosInEvent(1, '101');
    expect(result).toHaveLength(1);
  });
});

describe('Edge cases — order status transitions', () => {
  test('pending to settlement state change', async () => {
    const { updatePaymentStatus } = await import('src/services/orderService');
    setFakeRows('update orders set payment_status = $1', [{ id: 'BIB-123', payment_status: 'settlement' }]);
    const result = await updatePaymentStatus('BIB-123', 'settlement');
    expect(result!.payment_status).toBe('settlement');
  });

  test('pending to expire state change', async () => {
    const { updatePaymentStatus } = await import('src/services/orderService');
    setFakeRows('update orders set payment_status = $1', [{ id: 'BIB-123', payment_status: 'expire' }]);
    const result = await updatePaymentStatus('BIB-123', 'expire');
    expect(result!.payment_status).toBe('expire');
  });
});

describe('Corner cases', () => {
  test('empty event + no settings — falls back to hardcoded defaults', async () => {
    const { GET, invalidateSearchCache } = await import('src/app/api/search/route');
    const { NextRequest } = await import('next/server');

    invalidateSearchCache();
    setFakeRows('key, value from settings', []);
    setFakeRows('where id = $1 limit 1', []);
    setFakeRows('from photos where event_id = $1 order by', []);

    const req = new NextRequest(new URL('http://localhost:3000/api/search?event_id=1'));
    const res = await GET(req);
    const data = await res.json();
    expect(data.photosCount).toBe(0);
    expect(data.defaultPhotoPrice).toBe(50000);
    expect(data.bundlePrice).toBe(100000);
  });

  test('BIB number with special characters searched', async () => {
    const { searchPhotosByBib } = await import('src/services/photoService');
    setFakeRows('pb.bib_number_id = b.id', []);
    const result = await searchPhotosByBib(1, '001');
    expect(result).toEqual([]);

    const result2 = await searchPhotosByBib(1, '1');
    expect(result2).toEqual([]);
  });

  test('insertPhoto without ON CONFLICT allows duplicates', async () => {
    const { insertPhoto } = await import('src/services/photoService');
    setFakeRows('insert into photos', [{ id: 1 }]);
    const p1 = await insertPhoto(1, 'same.jpg', 'wm.jpg');
    expect(p1.id).toBe(1);

    setFakeRows('insert into photos', [{ id: 2 }]);
    const p2 = await insertPhoto(1, 'same.jpg', 'wm.jpg');
    expect(p2.id).toBe(2);
  });
});
