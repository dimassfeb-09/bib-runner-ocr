import { pool } from '../src/lib/db';
import crypto from 'crypto';

async function runSeed() {
  console.log('--------------------------------------------------');
  console.log('🌱 Memulai Proses Seeding Dataset Besar (50+ Data)...');
  console.log('--------------------------------------------------');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL tidak ditemukan di environment variables.');
    process.exit(1);
  }

  try {
    console.log('🧹 Membersihkan database lama...');
    await pool.query('TRUNCATE order_items, orders, photo_bibs, bib_numbers, photos, events CASCADE');
    console.log('✅ Pembersihan selesai.');

    // 1. INPUT 5 EVENTS
    console.log('📅 Memasukkan 5 Event Lari...');
    const eventsData = [
      { name: 'Borobudur Marathon 2026', date: '2026-03-15', loc: 'Magelang, Jawa Tengah', bundlePrice: 85000 },
      { name: 'Jakarta Half Marathon 2026', date: '2026-05-10', loc: 'DKI Jakarta', bundlePrice: null },
      { name: 'Bali Marathon 2026', date: '2026-08-30', loc: 'Gianyar, Bali', bundlePrice: 90000 },
      { name: 'Bandung Ultra Trail 2026', date: '2026-09-12', loc: 'Lembang, Jawa Barat', bundlePrice: null },
      { name: 'Surabaya 10K City Run 2026', date: '2026-11-05', loc: 'Surabaya, Jawa Timur', bundlePrice: null }
    ];

    const eventIds: number[] = [];
    for (const ev of eventsData) {
      const res = await pool.query(
        'INSERT INTO events (name, event_date, location, bundle_price) VALUES ($1, $2, $3, $4) RETURNING id',
        [ev.name, ev.date, ev.loc, ev.bundlePrice]
      );
      eventIds.push(res.rows[0].id);
    }
    console.log(`✅ ${eventIds.length} Event berhasil dibuat.`);

    // 2. TEMPLATE UNSPLASH PHOTO URLS
    const photoTemplates = [
      'https://images.unsplash.com/photo-1486218119243-13883505764c',
      'https://images.unsplash.com/photo-1502224562085-639556652f33',
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8',
      'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e',
      'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3',
      'https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a',
      'https://images.unsplash.com/photo-1530143311094-34d807799e8f',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
      'https://images.unsplash.com/photo-1538805060514-97d9cc17730c',
      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5',
      'https://images.unsplash.com/photo-1571008887538-b36bb32f4571',
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2',
      'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e',
      'https://images.unsplash.com/photo-1516245556508-7d60d4ff0f39',
      'https://images.unsplash.com/photo-1594882645126-14020914d58d',
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
      'https://images.unsplash.com/photo-1502904580116-2184a2226218',
      'https://images.unsplash.com/photo-1524646349956-1590eabfa322'
    ];

    // 3. GENERATE 25 PHOTOS (5 Photos per Event)
    console.log('🖼️ Memasukkan 25 Foto Lari...');
    const photoIds: number[] = [];
    const photoToEventMap = new Map<number, number>();

    for (let i = 0; i < 25; i++) {
      const eventIdx = Math.floor(i / 5);
      const eventId = eventIds[eventIdx];
      // Ambil template URL secara berputar, tambahkan parameter query unik agar berbeda
      const templateUrl = photoTemplates[i % photoTemplates.length];
      const imageUrl = `${templateUrl}?w=800&auto=format&fit=crop&q=80&sig=${i + 1}`;
      
      // Set custom price for some photos (every 4th photo has a premium custom price of 75000, others have NULL)
      const customPrice = i % 4 === 0 ? 75000 : null;

      const res = await pool.query(
        'INSERT INTO photos (event_id, original_url, watermark_url, price) VALUES ($1, $2, $3, $4) RETURNING id',
        [eventId, imageUrl, imageUrl, customPrice]
      );
      const photoId = res.rows[0].id;
      photoIds.push(photoId);
      photoToEventMap.set(photoId, eventId);
    }
    console.log(`✅ ${photoIds.length} Foto berhasil dimasukkan.`);

    // 4. GENERATE 30 BIB NUMBERS (6 BIBs per Event)
    console.log('🔢 Memasukkan 30 BIB Number...');
    const bibIdsByEvent = new Map<number, number[]>();

    for (const eventId of eventIds) {
      const bibs: number[] = [];
      const prefix = eventId * 1000; // Contoh: BIB 2001-2006 untuk event ID 2

      for (let j = 1; j <= 6; j++) {
        const bibNum = (prefix + j).toString();
        const res = await pool.query(
          'INSERT INTO bib_numbers (event_id, number) VALUES ($1, $2) RETURNING id',
          [eventId, bibNum]
        );
        bibs.push(res.rows[0].id);
      }
      bibIdsByEvent.set(eventId, bibs);
    }
    console.log('✅ 30 BIB Number berhasil dimasukkan.');

    // 5. HUBUNGKAN FOTO DENGAN BIB (50+ PHOTO-BIB RELATIONSHIPS)
    console.log('🔗 Menghubungkan Foto dengan BIB (50+ data relasi)...');
    let relationCount = 0;

    for (const photoId of photoIds) {
      const eventId = photoToEventMap.get(photoId)!;
      const eventBibs = bibIdsByEvent.get(eventId)!;

      // Setiap foto diberi 1-3 BIB secara acak untuk mensimulasikan group runner/single runner
      const numberOfBibs = 1 + (photoId % 3); // 1, 2, atau 3 BIB
      const chosenIndexes = new Set<number>();
      
      while (chosenIndexes.size < numberOfBibs) {
        chosenIndexes.add(Math.floor(Math.random() * eventBibs.length));
      }

      for (const idx of chosenIndexes) {
        const bibId = eventBibs[idx];
        await pool.query(
          'INSERT INTO photo_bibs (photo_id, bib_number_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [photoId, bibId]
        );
        relationCount++;
      }
    }
    console.log(`✅ ${relationCount} Hubungan Foto-BIB berhasil dibuat.`);

    // 6. GENERATE 10 TRANSAKSI / ORDERS (Berbagai status & tanggal)
    console.log('💰 Membuat 10 Transaksi Pembayaran Dummy...');
    const statuses = ['settlement', 'pending', 'expire', 'deny'];
    const emails = [
      'runner.satu@gmail.com', 'budi.maraton@yahoo.com', 'clara.run@outlook.com',
      'doni.surabaya@gmail.com', 'eka.bali@gmail.com', 'fitra.jakarta@gmail.com'
    ];

    const priceResult = await pool.query("SELECT value FROM settings WHERE key = 'photo_price' LIMIT 1");
    const photoPrice = priceResult.rows[0] ? parseInt(priceResult.rows[0].value, 10) : 50000;

    for (let k = 1; k <= 10; k++) {
      const orderId = `BIB-DUMMY-${1700000000 + k}`;
      const email = emails[k % emails.length];
      const status = k <= 5 ? 'settlement' : statuses[k % statuses.length]; // 5 Sukses, sisanya pending/expire
      
      // Pilih 1 hingga 3 foto acak untuk dibeli
      const numberOfPhotos = 1 + (k % 3);
      const selectedPhotos: number[] = [];
      const tempSet = new Set<number>();
      while (tempSet.size < numberOfPhotos) {
        tempSet.add(photoIds[Math.floor(Math.random() * photoIds.length)]);
      }
      selectedPhotos.push(...tempSet);

      const totalAmount = selectedPhotos.length * photoPrice;
      const token = crypto.randomUUID();
      const dateOffsetDays = k * 2; // Mengatur tanggal agar bervariasi beberapa hari ke belakang
      
      // Insert Order
      await pool.query(
        `INSERT INTO orders (id, buyer_email, payment_status, total_amount, download_token, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${dateOffsetDays} days', NOW() - INTERVAL '${dateOffsetDays} days')`,
        [orderId, email, status, totalAmount, token]
      );

      // Insert Order Items
      for (const pId of selectedPhotos) {
        await pool.query(
          'INSERT INTO order_items (order_id, photo_id) VALUES ($1, $2)',
          [orderId, pId]
        );
      }
    }

    console.log('✅ 10 Transaksi Pembayaran dummy berhasil dibuat.');

    // 7. GENERATE DUMMY UNRECOGNIZED BIBS FOR REVIEW
    console.log('🔍 Membuat 5 data peninjauan BIB akurasi rendah...');
    const unrecognizedData = [
      { photoIdx: 2, number: '1088', conf: 0.4200 },
      { photoIdx: 4, number: '2099', conf: 0.3550 },
      { photoIdx: 7, number: '2105', conf: 0.6120 },
      { photoIdx: 12, number: '3088', conf: 0.4890 },
      { photoIdx: 18, number: '4099', conf: 0.5210 }
    ];

    for (const item of unrecognizedData) {
      const photoId = photoIds[item.photoIdx];
      await pool.query(
        `INSERT INTO unrecognized_bibs (photo_id, suggested_number, confidence_score, status)
         VALUES ($1, $2, $3, $4)`,
        [photoId, item.number, item.conf, 'pending']
      );
    }
    console.log('✅ 5 Data peninjauan BIB berhasil dibuat.');

    console.log('--------------------------------------------------');
    console.log('🎉 PROSES SEEDING SELESAI DENGAN SUKSES!');
    console.log('--------------------------------------------------');
    
    // Tampilkan informasi sampel untuk mempermudah pengujian
    const sampleEventId = eventIds[0];
    const sampleBibs = await pool.query('SELECT number FROM bib_numbers WHERE event_id = $1 LIMIT 3', [sampleEventId]);
    const sampleTokens = await pool.query("SELECT id, download_token, buyer_email FROM orders WHERE payment_status = 'settlement' LIMIT 2");

    console.log('Sample Data Untuk Pengujian Anda:');
    console.log(`👉 Event: ${eventsData[0].name}`);
    console.log(`   Cari Nomor BIB: ${sampleBibs.rows.map(r => `"${r.number}"`).join(', ')}`);
    console.log('');
    console.log(`👉 Event: ${eventsData[1].name}`);
    console.log(`   Cari Nomor BIB: "${sampleEventId * 1000 + 7}" (atau cek daftar di panel admin)`);
    console.log('');
    console.log('Sample Transaksi Sukses (Lunas):');
    for (const r of sampleTokens.rows) {
      console.log(`   🔸 Order ID: ${r.id} | Email: ${r.buyer_email}`);
      console.log(`      Tautan Unduh: /download/${r.download_token}`);
    }
    console.log('--------------------------------------------------');

  } catch (error) {
    console.error('❌ Seeding GAGAL!');
    console.error('Detail Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Koneksi database ditutup.');
  }
}

runSeed();
