import { query } from 'src/lib/db';
import { Event } from 'src/types';

export async function getAllEvents(): Promise<Event[]> {
  const result = await query<Event>(
    'SELECT * FROM events ORDER BY event_date DESC, id DESC'
  );
  return result.rows;
}

export async function getEventById(id: number): Promise<Event | null> {
  const result = await query<Event>(
    'SELECT * FROM events WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createEvent(
  name: string,
  eventDate: string,
  location: string | null
): Promise<Event> {
  const result = await query<Event>(
    'INSERT INTO events (name, event_date, location) VALUES ($1, $2, $3) RETURNING *',
    [name, eventDate, location || null]
  );
  return result.rows[0];
}

export async function updateEventBundlePrice(
  id: number,
  bundlePrice: number | null
): Promise<Event | null> {
  const result = await query<Event>(
    'UPDATE events SET bundle_price = $1 WHERE id = $2 RETURNING *',
    [bundlePrice, id]
  );
  return (result.rows[0]) || null;
}

export async function updateBibPrice(
  eventId: number,
  bibNumber: string,
  price: number | null
): Promise<boolean> {
  const result = await query(
    'UPDATE bib_numbers SET price = $1 WHERE event_id = $2 AND number = $3',
    [price, eventId, bibNumber]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getBibPrice(
  eventId: number,
  bibNumber: string
): Promise<number | null> {
  const result = await query<{ price: string | null }>(
    'SELECT price FROM bib_numbers WHERE event_id = $1 AND number = $2 LIMIT 1',
    [eventId, bibNumber]
  );
  if (result.rows.length === 0 || result.rows[0].price === null) {
    return null;
  }
  return parseFloat(result.rows[0].price);
}

export async function updateEvent(
  id: number,
  name: string,
  eventDate: string,
  location: string | null
): Promise<Event | null> {
  const result = await query<Event>(
    'UPDATE events SET name = $1, event_date = $2, location = $3 WHERE id = $4 RETURNING *',
    [name, eventDate, location, id]
  );
  return result.rows[0] || null;
}
