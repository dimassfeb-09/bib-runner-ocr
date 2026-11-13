import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cegah crash saat build time jika env variables kosong atau masih berupa placeholder malformed (mengandung '[')
const isUrlMalformed = !supabaseUrl || supabaseUrl.includes('[') || !supabaseUrl.startsWith('https://');
const isKeyMalformed = !supabaseServiceKey || supabaseServiceKey.includes('[');

if (isUrlMalformed || isKeyMalformed) {
  console.warn(
    '⚠️ Supabase credentials are empty or contain placeholders. Using dummy variables for build compilation.',
    { isUrlMalformed, isKeyMalformed, url: supabaseUrl?.slice(0, 30) }
  );
  supabaseUrl = 'https://placeholder-project-id.supabase.co';
  supabaseServiceKey = 'placeholder-service-role-key-for-build';
} else {
  console.log(
    `✅ Supabase client initialized: url=${supabaseUrl}, keyPrefix=${supabaseServiceKey.slice(0, 12)}...`
  );
}

// Inisialisasi Supabase Client dengan Service Role Key (Admin)
// Digunakan hanya di server-side (Next.js API Routes / Server Actions)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Helper untuk mengunggah file gambar ke Supabase Storage
 * @param bucket Nama bucket tujuan
 * @param path Nama file / path di dalam bucket
 * @param fileBuffer Buffer file gambar
 * @param contentType Tipe file (misal: 'image/jpeg')
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  fileBuffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  console.log(`📤 uploadToStorage: bucket=${bucket}, path=${path}, size=${fileBuffer.length}`);

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    // Log full error object including cause for deeper diagnosis (e.g., ECONNREFUSED, DEPTH_ZERO_SELF_SIGNED_CERT)
    console.error('❌ Supabase upload error:', {
      message: error.message,
      cause: (error as unknown as { cause?: unknown })?.cause,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  // Jika bucket publik, ambil public URL
  if (bucket === process.env.SUPABASE_PUBLIC_BUCKET) {
    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);
    return publicData.publicUrl;
  }

  // Jika bucket private, kembalikan key path (URL lengkap di-generate dinamis via Signed URL saat diakses)
  return path;
}

/**
 * Helper untuk menghapus file dari Supabase Storage
 * @param bucket Nama bucket
 * @param path Path file yang akan dihapus
 */
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`Failed to delete from storage (${bucket}/${path}):`, error.message);
  }
}

