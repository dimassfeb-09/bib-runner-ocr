import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function runMigration() {
  console.log('--------------------------------------------------');
  console.log('🚀 Memulai Proses Migrasi Database...');
  console.log('--------------------------------------------------');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL tidak ditemukan di environment variables.');
    console.error('Pastikan file .env sudah diisi dengan benar.');
    process.exit(1);
  }

  // Sembunyikan password di log untuk keamanan
  const maskedConn = connectionString.replace(/:([^:@]+)@/, ':******@');
  console.log(`📡 Menghubungkan ke: ${maskedConn}`);

  try {
    // Membaca file schema.sql
    const schemaPath = join(process.cwd(), 'schema.sql');
    console.log(`📖 Membaca file schema di: ${schemaPath}`);
    const sql = readFileSync(schemaPath, 'utf8');

    // Menjalankan query SQL
    console.log('⏳ Menjalankan query SQL ke database...');
    const start = Date.now();
    await pool.query(sql);

    // Menambahkan kolom harga kustom & bundling jika tabel sudah ada sebelumnya
    console.log('⚙️ Menyesuaikan kolom harga kustom dan bundling...');
    await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS bundle_price DECIMAL(12, 2) DEFAULT NULL');
    await pool.query('ALTER TABLE photos ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2) DEFAULT NULL');
    await pool.query('ALTER TABLE photo_bibs ADD COLUMN IF NOT EXISTS bbox INTEGER[] DEFAULT NULL');
    await pool.query('ALTER TABLE unrecognized_bibs ADD COLUMN IF NOT EXISTS bbox INTEGER[] DEFAULT NULL');
    await pool.query('ALTER TABLE bib_numbers ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2) DEFAULT NULL');

    const duration = Date.now() - start;

    console.log(`✅ Migrasi tabel BERHASIL! (Selesai dalam ${duration}ms)`);

    // Pembuatan default admin user jika belum ada
    console.log('👤 Memeriksa ketersediaan akun admin...');
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admins');
    const adminCount = parseInt(adminCheck.rows[0].count, 10);

    if (adminCount === 0) {
      console.log('📝 Tidak ada akun admin ditemukan. Membuat akun default...');
      const defaultUsername = 'admin';
      const defaultPassword = 'admin123';
      const hashedPassword = hashPassword(defaultPassword);

      await pool.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        [defaultUsername, hashedPassword]
      );
      console.log('🎉 Default admin berhasil dibuat!');
      console.log(`   👉 Username: ${defaultUsername}`);
      console.log(`   👉 Password: ${defaultPassword}`);
    } else {
      console.log('👤 Akun admin sudah tersedia.');
    }

    // Pembuatan default settings jika belum ada
    console.log('⚙️ Memeriksa ketersediaan pengaturan default...');
    const settingsCheck = await pool.query("SELECT COUNT(*) FROM settings WHERE key = 'photo_price'");
    const settingsCount = parseInt(settingsCheck.rows[0].count, 10);

    if (settingsCount === 0) {
      console.log("📝 Harga foto default belum diatur. Menyimpan '50000' ke tabel settings...");
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ('photo_price', '50000')"
      );
      console.log('🎉 Harga foto default berhasil disimpan!');
    } else {
      console.log('⚙️ Pengaturan harga foto sudah tersedia.');
    }

    // Default bundling price config
    const bundleCheck = await pool.query("SELECT COUNT(*) FROM settings WHERE key = 'default_bundle_price'");
    const bundleCount = parseInt(bundleCheck.rows[0].count, 10);
    if (bundleCount === 0) {
      console.log("📝 Harga bundling default belum diatur. Menyimpan '100000' ke settings...");
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ('default_bundle_price', '100000')"
      );
      console.log('🎉 Harga bundling default berhasil disimpan!');
    } else {
      console.log('⚙️ Pengaturan harga bundling sudah tersedia.');
    }
  } catch (error) {
    console.error('❌ Migrasi GAGAL!');
    console.error('Detail Error:', error);
    process.exit(1);
  } finally {
    // Menutup koneksi pool agar script selesai dengan bersih
    await pool.end();
    console.log('🔌 Koneksi database ditutup.');
    console.log('--------------------------------------------------');
  }
}

runMigration();
