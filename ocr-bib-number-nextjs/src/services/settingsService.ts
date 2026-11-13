import { query } from 'src/lib/db';

export async function getSettings(): Promise<Record<string, string>> {
  const result = await query('SELECT key, value FROM settings');
  const config: Record<string, string> = {};
  result.rows.forEach((row) => {
    config[row.key] = row.value;
  });
  return config;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) 
     DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}
export async function getSettingByKey(key: string): Promise<string | null> {
  const result = await query('SELECT value FROM settings WHERE key = $1 LIMIT 1', [key]);
  return result.rows[0]?.value || null;
}
