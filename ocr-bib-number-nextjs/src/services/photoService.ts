import { query } from 'src/lib/db';
import { Photo } from 'src/types';

export interface BibDetail {
  number: string;
  bbox: number[] | null;
}

export interface PhotoWithBibs {
  id: number;
  watermark_url: string;
  bibs: string | null;
  bib_details?: BibDetail[] | null;
}

export async function getPhotosByEvent(eventId: number): Promise<Photo[]> {
  const result = await query<Photo>(
    'SELECT * FROM photos WHERE event_id = $1 ORDER BY id DESC',
    [eventId]
  );
  return result.rows;
}

export async function searchPhotosByBib(eventId: number, bibNumber: string): Promise<(Photo & { bbox: number[] | null })[]> {
  const result = await query<Photo & { bbox: number[] | null }>(
    `SELECT p.id, p.watermark_url, p.uploaded_at, p.price, pb.bbox
     FROM photos p
     JOIN photo_bibs pb ON p.id = pb.photo_id
     JOIN bib_numbers b ON pb.bib_number_id = b.id
     WHERE p.event_id = $1 AND b.number = $2
     ORDER BY p.id DESC`,
    [eventId, bibNumber]
  );
  return result.rows;
}

export async function getGalleryPhotos(
  eventId: number, 
  bibNumber?: string,
  limit?: number,
  offset?: number
): Promise<PhotoWithBibs[]> {
  let sqlQuery = '';
  let params: any[] = [];
  
  const hasLimit = limit !== undefined && limit !== null;
  const hasOffset = offset !== undefined && offset !== null;

  if (bibNumber && bibNumber.trim() !== '') {
    sqlQuery = `
      SELECT 
        p.id, 
        p.watermark_url, 
        STRING_AGG(b.number, ', ') as bibs,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('number', b.number, 'bbox', pb.bbox, 'price', b.price)
          ) FILTER (WHERE b.number IS NOT NULL),
          '[]'::json
        ) as bib_details
      FROM photos p
      LEFT JOIN photo_bibs pb ON p.id = pb.photo_id
      LEFT JOIN bib_numbers b ON pb.bib_number_id = b.id
      WHERE p.event_id = $1
        AND p.id IN (
          SELECT pb2.photo_id 
          FROM photo_bibs pb2 
          JOIN bib_numbers b2 ON pb2.bib_number_id = b2.id 
          WHERE b2.event_id = $1 AND b2.number = $2
        )
      GROUP BY p.id
      ORDER BY p.id DESC
    `;
    params = [eventId, bibNumber.trim()];
    
    if (hasLimit) {
      sqlQuery += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }
    if (hasOffset) {
      sqlQuery += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }
  } else {
    sqlQuery = `
      SELECT 
        p.id, 
        p.watermark_url, 
        STRING_AGG(b.number, ', ') as bibs,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('number', b.number, 'bbox', pb.bbox, 'price', b.price)
          ) FILTER (WHERE b.number IS NOT NULL),
          '[]'::json
        ) as bib_details
      FROM photos p
      LEFT JOIN photo_bibs pb ON p.id = pb.photo_id
      LEFT JOIN bib_numbers b ON pb.bib_number_id = b.id
      WHERE p.event_id = $1
      GROUP BY p.id
      ORDER BY p.id DESC
    `;
    params = [eventId];
    
    if (hasLimit) {
      sqlQuery += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }
    if (hasOffset) {
      sqlQuery += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }
  }

  const result = await query<PhotoWithBibs>(sqlQuery, params);
  return result.rows;
}

export async function getPhotoByIdAndEvent(photoId: number, eventId: number): Promise<Photo | null> {
  const result = await query<Photo>(
    'SELECT * FROM photos WHERE id = $1 AND event_id = $2 LIMIT 1',
    [photoId, eventId]
  );
  return result.rows[0] || null;
}

export async function insertPhoto(eventId: number, originalUrl: string, watermarkUrl: string): Promise<Photo> {
  const result = await query<Photo>(
    `INSERT INTO photos (event_id, original_url, watermark_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [eventId, originalUrl, watermarkUrl]
  );
  return result.rows[0];
}

export async function updatePhotoPrice(photoId: number, price: number | null, eventId: number): Promise<Photo | null> {
  const result = await query<Photo>(
    'UPDATE photos SET price = $1 WHERE id = $2 AND event_id = $3 RETURNING *',
    [price, photoId, eventId]
  );
  return result.rows[0] || null;
}

export async function deletePhoto(photoId: number, eventId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM photos WHERE id = $1 AND event_id = $2',
    [photoId, eventId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getPhotosByIds(photoIds: number[]): Promise<Photo[]> {
  const result = await query<Photo>(
    'SELECT id, event_id, price FROM photos WHERE id = ANY($1::int[])',
    [photoIds]
  );
  return result.rows;
}

export async function getPhotoBibMappings(photoIds: number[]): Promise<{ photo_id: number; bib_number: string; event_id: number }[]> {
  const result = await query<{ photo_id: number; bib_number: string; event_id: number }>(
    `SELECT pb.photo_id, b.number as bib_number, b.event_id
     FROM photo_bibs pb
     JOIN bib_numbers b ON pb.bib_number_id = b.id
     WHERE pb.photo_id = ANY($1::int[])`,
    [photoIds]
  );
  return result.rows;
}

export async function getAllBibPhotosInEvent(eventId: number, bibNumber: string): Promise<number[]> {
  const result = await query<{ photo_id: number }>(
    `SELECT DISTINCT pb.photo_id
     FROM photo_bibs pb
     JOIN bib_numbers b ON pb.bib_number_id = b.id
     WHERE b.event_id = $1 AND b.number = $2`,
    [eventId, bibNumber]
  );
  return result.rows.map((row) => row.photo_id);
}

export async function mapPhotoToBib(eventId: number, photoId: number, bibNumber: string, bbox?: number[]): Promise<void> {
  const cleanBib = bibNumber.trim();
  if (!cleanBib) return;

  // Insert to bib_numbers (ON CONFLICT ignore)
  await query(
    `INSERT INTO bib_numbers (event_id, number)
     VALUES ($1, $2)
     ON CONFLICT (event_id, number) DO NOTHING`,
    [eventId, cleanBib]
  );

  // Get ID bib_number
  const bibRes = await query(
    'SELECT id FROM bib_numbers WHERE event_id = $1 AND number = $2 LIMIT 1',
    [eventId, cleanBib]
  );
  const bibId = bibRes.rows[0]?.id;

  // Connect photo_bibs
  if (bibId) {
    await query(
      `INSERT INTO photo_bibs (photo_id, bib_number_id, bbox)
       VALUES ($1, $2, $3)
       ON CONFLICT (photo_id, bib_number_id) DO UPDATE SET bbox = EXCLUDED.bbox`,
      [photoId, bibId, bbox || null]
    );
  }
}
