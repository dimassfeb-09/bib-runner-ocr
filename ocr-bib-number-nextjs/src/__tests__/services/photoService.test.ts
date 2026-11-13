import { describe, expect, test, beforeEach } from 'bun:test';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { makePhoto } from 'src/__tests__/helpers';
import {
  getPhotosByEvent,
  searchPhotosByBib,
  getGalleryPhotos,
  getPhotoByIdAndEvent,
  insertPhoto,
  updatePhotoPrice,
  deletePhoto,
  getPhotosByIds,
  getPhotoBibMappings,
  getAllBibPhotosInEvent,
  mapPhotoToBib,
} from 'src/services/photoService';

beforeEach(clearFakeRows);

describe('getPhotosByEvent', () => {
  test('returns photos for event', async () => {
    setFakeRows('from photos where event_id = $1 order by', [makePhoto(), makePhoto({ id: 2 })]);
    const result = await getPhotosByEvent(1);
    expect(result).toHaveLength(2);
  });

  test('returns empty array for event with no photos', async () => {
    setFakeRows('from photos where event_id = $1 order by', []);
    expect(await getPhotosByEvent(1)).toEqual([]);
  });
});

describe('searchPhotosByBib', () => {
  test('returns photos with matching bib number', async () => {
    setFakeRows('pb.bib_number_id = b.id', [makePhoto({ id: 1 }), makePhoto({ id: 3 })]);
    const result = await searchPhotosByBib(1, '101');
    expect(result).toHaveLength(2);
  });

  test('returns empty when no photos match bib', async () => {
    setFakeRows('pb.bib_number_id = b.id', []);
    expect(await searchPhotosByBib(1, '999')).toEqual([]);
  });
});

describe('getGalleryPhotos', () => {
  test('returns photos with bib details', async () => {
    setFakeRows('json_agg', [{ id: 1, watermark_url: 'url', bibs: '101, 102', bib_details: '[]' }]);
    const result = await getGalleryPhotos(1);
    expect(result).toHaveLength(1);
  });

  test('applies limit and offset', async () => {
    setFakeRows('json_agg', [makePhoto()]);
    const result = await getGalleryPhotos(1, undefined, 1, 0);
    expect(result).toHaveLength(1);
  });

  test('filters by bib number when provided', async () => {
    setFakeRows('b2.event_id = $1 and b2.number = $2', [makePhoto()]);
    const result = await getGalleryPhotos(1, '101');
    expect(result).toHaveLength(1);
  });
});

describe('getPhotoByIdAndEvent', () => {
  test('returns photo match', async () => {
    setFakeRows('where id = $1 and event_id = $2 limit 1', [makePhoto()]);
    expect(await getPhotoByIdAndEvent(1, 1)).not.toBeNull();
  });

  test('returns null if no match', async () => {
    setFakeRows('where id = $1 and event_id = $2 limit 1', []);
    expect(await getPhotoByIdAndEvent(1, 1)).toBeNull();
  });
});

describe('insertPhoto', () => {
  test('inserts and returns photo', async () => {
    setFakeRows('insert into photos', [makePhoto({ original_url: 'events/1/orig.jpg', watermark_url: 'events/1/wm.jpg' })]);
    const photo = await insertPhoto(1, 'events/1/orig.jpg', 'events/1/wm.jpg');
    expect(photo.original_url).toBe('events/1/orig.jpg');
    expect(photo.watermark_url).toBe('events/1/wm.jpg');
  });
});

describe('updatePhotoPrice', () => {
  test('updates price', async () => {
    setFakeRows('update photos set price = $1 where id = $2', [makePhoto({ price: 75000 })]);
    const photo = await updatePhotoPrice(1, 75000, 1);
    expect(photo!.price).toBe(75000);
  });
});

describe('deletePhoto', () => {
  test('returns true when deleted', async () => {
    setFakeRows('delete from photos where id = $1', [], 1);
    expect(await deletePhoto(1, 1)).toBe(true);
  });

  test('returns false when nothing deleted', async () => {
    setFakeRows('delete from photos where id = $1', [], 0);
    expect(await deletePhoto(1, 1)).toBe(false);
  });
});

describe('getPhotosByIds', () => {
  test('returns photos matching ids', async () => {
    setFakeRows('where id = any($1::int[])', [makePhoto(), makePhoto({ id: 2 })]);
    const result = await getPhotosByIds([1, 2]);
    expect(result).toHaveLength(2);
  });

  test('returns empty for empty array', async () => {
    setFakeRows('where id = any($1::int[])', []);
    expect(await getPhotosByIds([])).toEqual([]);
  });
});

describe('getPhotoBibMappings', () => {
  test('returns bib mappings for photos', async () => {
    const rows = [
      { photo_id: 1, bib_number: '101', event_id: 1 },
      { photo_id: 2, bib_number: '102', event_id: 1 },
    ];
    setFakeRows('bib_number_id = b.id', rows);
    const result = await getPhotoBibMappings([1, 2]);
    expect(result).toHaveLength(2);
    expect(result[0].bib_number).toBe('101');
  });
});

describe('getAllBibPhotosInEvent', () => {
  test('returns photo ids for bib', async () => {
    setFakeRows('select distinct pb.photo_id', [{ photo_id: 1 }, { photo_id: 2 }, { photo_id: 3 }]);
    const result = await getAllBibPhotosInEvent(1, '101');
    expect(result).toEqual([1, 2, 3]);
  });

  test('returns empty array when bib has no photos', async () => {
    setFakeRows('select distinct pb.photo_id', []);
    expect(await getAllBibPhotosInEvent(1, '999')).toEqual([]);
  });
});

describe('mapPhotoToBib', () => {
  test('inserts bib number and mapping', async () => {
    setFakeRows('insert into bib_numbers', []);
    setFakeRows('select id from bib_numbers where event_id = $1 and number = $2 limit 1', [{ id: 1 }]);
    setFakeRows('insert into photo_bibs', []);
    await mapPhotoToBib(1, 1, '101');
  });

  test('trims whitespace from bib number', async () => {
    setFakeRows('insert into bib_numbers', []);
    setFakeRows('select id from bib_numbers where event_id = $1 and number = $2 limit 1', [{ id: 1 }]);
    setFakeRows('insert into photo_bibs', []);
    await mapPhotoToBib(1, 1, '  101  ');
  });

  test('skips if bib number is empty after trim', async () => {
    await mapPhotoToBib(1, 1, '   ');
  });
});
