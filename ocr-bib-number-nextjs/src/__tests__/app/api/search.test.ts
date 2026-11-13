import { describe, expect, test, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { makeEvent, makePhoto } from 'src/__tests__/helpers';
import { GET, invalidateSearchCache } from 'src/app/api/search/route';

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

beforeEach(() => {
  clearFakeRows();
  invalidateSearchCache();
});

describe('GET /api/search', () => {
  test('happy path — returns photos with bundle price', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    setFakeRows('pb.bib_number_id = b.id', [makePhoto()]);

    const res = await GET(makeRequest('/api/search?event_id=1&bib_number=101'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.photos).toHaveLength(1);
    expect(data.bundlePrice).toBe(100000);
  });

  test('returns all photos when bib_number is empty', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }]);
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    setFakeRows('from photos where event_id = $1 order by', [makePhoto(), makePhoto({ id: 2 })]);

    const res = await GET(makeRequest('/api/search?event_id=1'));
    const data = await res.json();
    expect(data.photosCount).toBe(2);
  });

  test('400 when event_id is missing', async () => {
    const res = await GET(makeRequest('/api/search'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('event_id parameter is required');
  });

  test('400 when event_id is not a number', async () => {
    const res = await GET(makeRequest('/api/search?event_id=abc'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid event_id');
  });

  test('negative event_id is accepted (parseInt converts to number)', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }]);
    setFakeRows('where id = $1 limit 1', []);
    setFakeRows('from photos where event_id = $1 order by', []);
    const res = await GET(makeRequest('/api/search?event_id=-1'));
    expect(res.status).toBe(200);
  });

  test('accepts event_id = 0', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }]);
    setFakeRows('where id = $1 limit 1', []);
    setFakeRows('from photos where event_id = $1 order by', []);
    const res = await GET(makeRequest('/api/search?event_id=0'));
    expect(res.status).toBe(200);
  });

  test('photo with null price falls back to default', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }]);
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    setFakeRows('from photos where event_id = $1 order by', [makePhoto({ price: null })]);

    const res = await GET(makeRequest('/api/search?event_id=1'));
    const data = await res.json();
    expect(data.photos[0].price).toBe(50000);
  });

  test('uses event bundle_price when available', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = $1 limit 1', [makeEvent({ bundle_price: 150000 })]);
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    setFakeRows('pb.bib_number_id = b.id', [makePhoto()]);

    const res = await GET(makeRequest('/api/search?event_id=1&bib_number=101'));
    const data = await res.json();
    expect(data.bundlePrice).toBe(150000);
  });

  test('caches response for 30 seconds', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    setFakeRows('pb.bib_number_id = b.id', [makePhoto()]);

    const res1 = await GET(makeRequest('/api/search?event_id=1&bib_number=101'));
    expect((await res1.json()).photosCount).toBe(1);

    clearFakeRows();
    setFakeRows('pb.bib_number_id = b.id', []);

    const res2 = await GET(makeRequest('/api/search?event_id=1&bib_number=101'));
    expect((await res2.json()).photosCount).toBe(1);
  });

  test('invalidateSearchCache clears cache for event', async () => {
    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    setFakeRows('pb.bib_number_id = b.id', [makePhoto()]);

    await GET(makeRequest('/api/search?event_id=1&bib_number=101'));

    clearFakeRows();
    invalidateSearchCache(1);

    setFakeRows('key, value from settings', [{ value: '50000' }, { value: '100000' }]);
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    setFakeRows('pb.bib_number_id = b.id', []);

    const res = await GET(makeRequest('/api/search?event_id=1&bib_number=101'));
    expect((await res.json()).photosCount).toBe(0);
  });

  test('settings with no photo_price falls back to defaults', async () => {
    setFakeRows('key, value from settings', []);
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    setFakeRows('from photos where event_id = $1 order by', [makePhoto({ price: null })]);

    const res = await GET(makeRequest('/api/search?event_id=1'));
    const data = await res.json();
    expect(data.defaultPhotoPrice).toBe(50000);
    expect(data.bundlePrice).toBe(100000);
  });
});
