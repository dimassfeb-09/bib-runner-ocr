import { query } from 'src/lib/db';
import { Admin } from 'src/types';

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  const result = await query<Admin>(
    'SELECT * FROM admins WHERE username = $1 LIMIT 1',
    [username]
  );
  return result.rows[0] || null;
}
