import { query } from 'src/lib/db';

export interface UnrecognizedBibRow {
  id: number;
  photo_id: number;
  suggested_number: string;
  confidence_score: string | number;
  status: string;
  created_at: Date;
  watermark_url: string;
  event_name: string;
  event_id: number;
  bbox?: number[];
}

export async function getPendingUnrecognizedBibs(): Promise<UnrecognizedBibRow[]> {
  const result = await query<UnrecognizedBibRow>(
    `SELECT ub.id, ub.photo_id, ub.suggested_number, ub.confidence_score, ub.status, ub.created_at, ub.bbox,
            p.watermark_url, e.name as event_name, p.event_id
     FROM unrecognized_bibs ub
     JOIN photos p ON ub.photo_id = p.id
     JOIN events e ON p.event_id = e.id
     WHERE ub.status = 'pending'
     ORDER BY ub.created_at DESC`
  );
  return result.rows;
}

export async function getUnrecognizedBibById(id: number): Promise<{ photo_id: number; event_id: number; suggested_number: string } | null> {
  const result = await query<{ photo_id: number; event_id: number; suggested_number: string }>(
    `SELECT ub.photo_id, p.event_id, ub.suggested_number 
     FROM unrecognized_bibs ub
     JOIN photos p ON ub.photo_id = p.id
     WHERE ub.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function acceptUnrecognizedBib(id: number, finalNumber: string, photoId: number, eventId: number): Promise<void> {
  // A. Ambil bbox dari unrecognized_bibs
  const bboxRes = await query(
    'SELECT bbox FROM unrecognized_bibs WHERE id = $1 LIMIT 1',
    [id]
  );
  const bbox = bboxRes.rows[0]?.bbox || null;

  // B. Insert ke bib_numbers (ON CONFLICT ignore)
  await query(
    `INSERT INTO bib_numbers (event_id, number)
     VALUES ($1, $2)
     ON CONFLICT (event_id, number) DO NOTHING`,
    [eventId, finalNumber]
  );

  // C. Ambil ID bib_number
  const bibRes = await query(
    'SELECT id FROM bib_numbers WHERE event_id = $1 AND number = $2 LIMIT 1',
    [eventId, finalNumber]
  );
  const bibId = bibRes.rows[0]?.id;

  if (!bibId) {
    throw new Error('Failed to retrieve or create BIB number ID');
  }

  // D. Hubungkan ke pivot table
  await query(
    `INSERT INTO photo_bibs (photo_id, bib_number_id, bbox)
     VALUES ($1, $2, $3)
     ON CONFLICT (photo_id, bib_number_id) DO UPDATE SET bbox = EXCLUDED.bbox`,
    [photoId, bibId, bbox]
  );

  // E. Update status to accepted
  await query(
    `UPDATE unrecognized_bibs
     SET status = 'accepted'
     WHERE id = $1`,
    [id]
  );
}

export async function rejectUnrecognizedBib(id: number): Promise<void> {
  await query(
    `UPDATE unrecognized_bibs
     SET status = 'rejected'
     WHERE id = $1`,
    [id]
  );
}

export async function insertUnrecognizedBib(photoId: number, suggestedNumber: string, confidenceScore: number, bbox?: number[]): Promise<void> {
  await query(
    `INSERT INTO unrecognized_bibs (photo_id, suggested_number, confidence_score, status, bbox)
     VALUES ($1, $2, $3, $4, $5)`,
    [photoId, suggestedNumber, confidenceScore, 'pending', bbox || null]
  );
}
