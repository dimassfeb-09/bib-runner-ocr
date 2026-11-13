import { mock } from 'bun:test';

const DB_MAP_KEY = '__test_db_map__';
const MAIL_KEY = '__test_mail_store__';

// Must be set before mock.module factory runs
(globalThis as any)[DB_MAP_KEY] = new Map<string, { rows: any[]; rowCount: number }>();
(globalThis as any)[MAIL_KEY] = { sent: [] as any[] };

function getDbMap(): Map<string, { rows: any[]; rowCount: number }> {
  return (globalThis as any)[DB_MAP_KEY];
}

function getMailStore(): { sent: any[] } {
  return (globalThis as any)[MAIL_KEY];
}

function queryMock(text: string) {
  const map = getDbMap();
  const normalized = text.replace(/\s+/g, ' ').toLowerCase();
  let best = { rows: [], rowCount: 0 };
  let bestLen = 0;
  for (const [key, result] of map) {
    if (normalized.includes(key) && key.length > bestLen) {
      best = result;
      bestLen = key.length;
    }
  }
  return best;
}

mock.module('src/lib/db', () => ({
  pool: {},
  query: async (text: string) => queryMock(text),
}));

mock.module('src/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'mock-path' }, error: null }),
        download: async () => ({ data: new Blob(['fake-image-data']), error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://mock.supabase.co/public/test.jpg' } }),
        remove: async () => ({ error: null }),
      }),
    },
  },
  uploadToStorage: async () => 'mock-storage-path',
  deleteFromStorage: async () => {},
}));

mock.module('src/lib/mailer', () => ({
  transporter: {
    sendMail: async (opts: any) => {
      getMailStore().sent.push(opts);
      return { messageId: 'mock-message-id' };
    },
  },
  sendDownloadLink: async (toEmail: string) => {
    getMailStore().sent.push({ type: 'download-link', toEmail });
  },
  sendPaymentInvoice: async (toEmail: string) => {
    getMailStore().sent.push({ type: 'payment-invoice', toEmail });
  },
}));

export function setFakeRows(sqlMatch: string, rows: any[], rowCount?: number) {
  getDbMap().set(sqlMatch.toLowerCase(), { rows, rowCount: rowCount ?? rows.length });
}

export function clearFakeRows() {
  getDbMap().clear();
}

export function clearSentMails() {
  getMailStore().sent.length = 0;
}

export function getSentMails(): any[] {
  return getMailStore().sent;
}
