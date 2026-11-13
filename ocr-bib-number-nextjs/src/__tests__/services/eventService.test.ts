import { describe, expect, test, beforeEach } from 'bun:test';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { makeEvent } from 'src/__tests__/helpers';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEventBundlePrice,
  updateBibPrice,
  getBibPrice,
  updateEvent,
} from 'src/services/eventService';

beforeEach(clearFakeRows);

describe('getAllEvents', () => {
  test('returns all events ordered by date desc', async () => {
    setFakeRows('from events order by', [makeEvent({ id: 2 }), makeEvent({ id: 1 })]);
    const result = await getAllEvents();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(2);
  });

  test('returns empty array when no events', async () => {
    setFakeRows('from events order by', []);
    expect(await getAllEvents()).toEqual([]);
  });
});

describe('getEventById', () => {
  test('returns event when found', async () => {
    setFakeRows('where id = $1 limit 1', [makeEvent()]);
    const event = await getEventById(1);
    expect(event).not.toBeNull();
    expect(event!.name).toBe('Lari Sehat 2026');
  });

  test('returns null when not found', async () => {
    setFakeRows('where id = $1 limit 1', []);
    expect(await getEventById(999)).toBeNull();
  });
});

describe('createEvent', () => {
  test('inserts and returns new event', async () => {
    setFakeRows('insert into events', [makeEvent()]);
    const event = await createEvent('Lari Sehat 2026', '2026-07-20', 'Jakarta');
    expect(event.name).toBe('Lari Sehat 2026');
  });
});

describe('updateEventBundlePrice', () => {
  test('updates bundle price', async () => {
    setFakeRows('update events set bundle_price', [makeEvent({ bundle_price: 150000 })]);
    const event = await updateEventBundlePrice(1, 150000);
    expect(event).not.toBeNull();
    expect(event!.bundle_price).toBe(150000);
  });
});

describe('updateBibPrice', () => {
  test('returns true when row updated', async () => {
    setFakeRows('update bib_numbers set price', [], 1);
    expect(await updateBibPrice(1, '101', 75000)).toBe(true);
  });

  test('returns false when no row matched', async () => {
    setFakeRows('update bib_numbers set price', [], 0);
    expect(await updateBibPrice(1, '999', 75000)).toBe(false);
  });
});

describe('getBibPrice', () => {
  test('returns price when bib has custom price', async () => {
    setFakeRows('select price from bib_numbers where', [{ price: '75000' }]);
    expect(await getBibPrice(1, '101')).toBe(75000);
  });

  test('returns null when bib not found', async () => {
    setFakeRows('select price from bib_numbers where', []);
    expect(await getBibPrice(1, '999')).toBeNull();
  });

  test('returns null when bib has null price', async () => {
    setFakeRows('select price from bib_numbers where', [{ price: null }]);
    expect(await getBibPrice(1, '101')).toBeNull();
  });
});

describe('updateEvent', () => {
  test('updates and returns event', async () => {
    setFakeRows('update events set name', [makeEvent({ name: 'Updated' })]);
    const event = await updateEvent(1, 'Updated', '2026-08-01', 'Bandung');
    expect(event!.name).toBe('Updated');
  });
});
