import { query } from 'src/lib/db';
import { Order } from 'src/types';

export interface OrderRow {
  id: string;
  buyer_email: string;
  payment_status: string;
  total_amount: string;
  download_token: string;
  created_at: Date;
  photo_ids: string | null;
}

export interface RecentTransaction {
  id: string;
  buyer_email: string;
  payment_status: string;
  total_amount: string;
  created_at: Date;
}

export interface OrderWithPhotos extends Order {
  photos: {
    id: number;
    watermark_url: string;
  }[];
}

export async function createOrder(
  orderId: string,
  email: string,
  totalAmount: number,
  photoIds: number[]
): Promise<Order> {
  // Insert order
  const orderResult = await query<Order>(
    'INSERT INTO orders (id, buyer_email, payment_status, total_amount) VALUES ($1, $2, $3, $4) RETURNING *',
    [orderId, email, 'pending', totalAmount]
  );
  
  const order = orderResult.rows[0];

  // Insert order items
  for (const photoId of photoIds) {
    await query(
      'INSERT INTO order_items (order_id, photo_id) VALUES ($1, $2)',
      [orderId, photoId]
    );
  }

  return order;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const result = await query<Order>(
    'SELECT * FROM orders WHERE id = $1 LIMIT 1',
    [orderId]
  );
  return result.rows[0] || null;
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  const result = await query<Order>(
    'SELECT * FROM orders WHERE download_token = $1 LIMIT 1',
    [token]
  );
  return result.rows[0] || null;
}

export async function getOrderWithPhotosByToken(token: string): Promise<OrderWithPhotos | null> {
  const order = await getOrderByToken(token);
  if (!order) return null;

  const photosRes = await query<{ id: number; watermark_url: string }>(
    `SELECT p.id, p.watermark_url
     FROM order_items oi
     JOIN photos p ON oi.photo_id = p.id
     WHERE oi.order_id = $1`,
    [order.id]
  );

  return {
    ...order,
    photos: photosRes.rows,
  };
}

export async function updatePaymentStatus(orderId: string, status: string): Promise<Order | null> {
  const result = await query<Order>(
    `UPDATE orders 
     SET payment_status = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 
     RETURNING *`,
    [status, orderId]
  );
  return result.rows[0] || null;
}

export async function getRecentTransactions(limit: number = 5): Promise<RecentTransaction[]> {
  const result = await query<RecentTransaction>(
    `SELECT id, buyer_email, payment_status, total_amount, created_at 
     FROM orders 
     ORDER BY created_at DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getAllTransactions(): Promise<OrderRow[]> {
  const sqlQuery = `
    SELECT 
      o.id, 
      o.buyer_email, 
      o.payment_status, 
      o.total_amount, 
      o.download_token, 
      o.created_at,
      STRING_AGG(oi.photo_id::text, ', ') as photo_ids
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  const result = await query<OrderRow>(sqlQuery);
  return result.rows;
}

export async function getDashboardStats() {
  const [revenueRes, soldRes, eventsCountRes, photosCountRes] = await Promise.all([
    query("SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'settlement'"),
    query("SELECT COUNT(*) as total FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.payment_status = 'settlement'"),
    query("SELECT COUNT(*) as total FROM events"),
    query("SELECT COUNT(*) as total FROM photos")
  ]);

  return {
    totalRevenue: revenueRes.rows[0]?.total ? parseFloat(revenueRes.rows[0].total) : 0,
    totalPhotosSold: soldRes.rows[0]?.total ? parseInt(soldRes.rows[0].total, 10) : 0,
    totalEvents: eventsCountRes.rows[0]?.total ? parseInt(eventsCountRes.rows[0].total, 10) : 0,
    totalPhotos: photosCountRes.rows[0]?.total ? parseInt(photosCountRes.rows[0].total, 10) : 0,
  };
}

export async function getOrderWithPhotosForDownload(orderId: string): Promise<{ id: number; original_url: string }[]> {
  const result = await query<{ id: number; original_url: string }>(
    `SELECT p.id, p.original_url
     FROM order_items oi
     JOIN photos p ON oi.photo_id = p.id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return result.rows;
}

export async function validateDownload(token: string, photoId: number): Promise<{ payment_status: string; original_url: string } | null> {
  const validationQuery = `
    SELECT o.payment_status, oi.photo_id, p.original_url
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN photos p ON oi.photo_id = p.id
    WHERE o.download_token = $1 AND oi.photo_id = $2
    LIMIT 1
  `;
  const result = await query<{ payment_status: string; original_url: string }>(
    validationQuery,
    [token, photoId]
  );
  return result.rows[0] || null;
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const result = await query<Order>(
    'SELECT * FROM orders WHERE buyer_email = $1 ORDER BY created_at DESC',
    [email]
  );
  return result.rows;
}

export interface OrderWithPhotosAndDetails extends Order {
  photos: {
    id: number;
    watermark_url: string;
    original_url: string;
  }[];
}

export async function getOrderWithPhotosByOrderId(orderId: string): Promise<OrderWithPhotosAndDetails | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const photosRes = await query<{ id: number; watermark_url: string; original_url: string }>(
    `SELECT p.id, p.watermark_url, p.original_url
     FROM order_items oi
     JOIN photos p ON oi.photo_id = p.id
     WHERE oi.order_id = $1`,
     [orderId]
  );

  return {
    ...order,
    photos: photosRes.rows,
  };
}

