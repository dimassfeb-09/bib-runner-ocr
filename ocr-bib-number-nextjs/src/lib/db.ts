import { Pool, QueryResult, QueryResultRow } from 'pg';

// Mencegah kebocoran koneksi di Next.js saat hot-reload (development mode)
const globalForDb = globalThis as unknown as {
  connPool: Pool | undefined;
};

// Inisialisasi Connection Pool menggunakan URL dari environment variable
export const pool =
  globalForDb.connPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Jumlah koneksi maksimum dalam pool
    idleTimeoutMillis: 30000, // Waktu koneksi idle sebelum ditutup
    connectionTimeoutMillis: 5000, // Waktu tunggu maksimal saat membuat koneksi baru
  });

if (process.env.NODE_ENV !== 'production') globalForDb.connPool = pool;

/**
 * Helper untuk menjalankan query SQL biasa secara aman (Parameterized Query)
 * @param text Query SQL (contoh: "SELECT * FROM users WHERE id = $1")
 * @param params Parameter untuk query (contoh: [userId])
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log query hanya di mode development untuk membantu debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('SQL Query Executed:', {
        text,
        duration: `${duration}ms`,
        rows: res.rowCount,
      });
    }

    return res;
  } catch (error: any) {
    console.error('SQL Query Error:', error.message || error);
    console.error('Executed Query:', text);
    if (params && params.length > 0) {
      console.error('Query Parameters:', params);
    }
    throw error;
  }
}
