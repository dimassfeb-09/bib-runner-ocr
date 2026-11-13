import { NextRequest, NextResponse } from 'next/server';
import { uploadToStorage, deleteFromStorage } from 'src/lib/supabase';
import { Photo } from 'src/types';
import sharp from 'sharp';
import crypto from 'crypto';
import { getEventById } from 'src/services/eventService';
import { getPhotoByIdAndEvent, insertPhoto, updatePhotoPrice, deletePhoto, mapPhotoToBib } from 'src/services/photoService';
import { insertUnrecognizedBib } from 'src/services/unrecognizedBibsService';
import { invalidateSearchCache } from 'src/app/api/search/route';

// Helper untuk mengecek session admin
function isAdmin(req: NextRequest): boolean {
  const sessionCookie = req.cookies.get('admin_session');
  return !!sessionCookie;
}

// Fungsi untuk menggambar watermark di atas gambar asli secara dinamis menggunakan Sharp (SVG composite)
async function addWatermark(
  imageBuffer: Buffer,
  eventName: string
): Promise<Buffer> {
  const image = sharp(imageBuffer).rotate();
  const metadata = await image.metadata();

  const width = metadata.width || 1200;
  const height = metadata.height || 800;

  // Nama event dan teks pembantu
  const watermarkText = eventName.toUpperCase();

  // Desain pattern watermark — tile kecil 120×180, teks berulang padat
  const svgText = `
    <svg width="${width}" height="${height}">
      <defs>
        <pattern id="watermark-pattern" width="120" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
          <rect width="120" height="180" fill="rgba(255,255,255,0.05)"/>
          <text x="60" y="20" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="900"
            fill="rgba(255,255,255,0.35)" stroke="rgba(0,0,0,0.08)" stroke-width="0.2">${watermarkText}</text>
          <text x="60" y="35" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="700"
            fill="rgba(255,255,255,0.2)">PREVIEW ONLY</text>
          <text x="60" y="55" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="900"
            fill="rgba(255,255,255,0.3)" stroke="rgba(0,0,0,0.08)" stroke-width="0.2">${watermarkText}</text>
          <text x="60" y="70" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="700"
            fill="rgba(255,255,255,0.15)">PREVIEW ONLY</text>
          <text x="60" y="90" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="900"
            fill="rgba(255,255,255,0.25)" stroke="rgba(0,0,0,0.08)" stroke-width="0.2">${watermarkText}</text>
          <text x="60" y="105" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="700"
            fill="rgba(255,255,255,0.12)">PREVIEW ONLY</text>
          <text x="60" y="125" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="900"
            fill="rgba(255,255,255,0.2)" stroke="rgba(0,0,0,0.08)" stroke-width="0.2">${watermarkText}</text>
          <text x="60" y="140" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="700"
            fill="rgba(255,255,255,0.1)">PREVIEW ONLY</text>
          <text x="60" y="160" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="900"
            fill="rgba(255,255,255,0.15)" stroke="rgba(0,0,0,0.08)" stroke-width="0.2">${watermarkText}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
    </svg>
  `;

  return image
    .composite([
      {
        input: Buffer.from(svgText),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}

// ENDPOINT: UPLOAD FOTO BARU KE EVENT (Hanya Admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.id, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
  }

  try {
    // 1. Ambil detail event untuk dijadikan watermark text
    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const eventName = event.name;

    // 2. Baca data form upload
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const model = formData.get('model') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    // 3. Konversi file gambar ke Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const uploadedBuffer = Buffer.from(arrayBuffer);

    // Auto-rotate gambar sesuai EXIF Orientation metadata agar tidak miring saat di-upload / diproses OCR
    let originalBuffer: Buffer = uploadedBuffer;
    try {
      originalBuffer = await sharp(uploadedBuffer).rotate().toBuffer();
    } catch (rotateErr) {
      console.warn('Gagal melakukan auto-rotate EXIF dengan Sharp, menggunakan buffer asli:', rotateErr);
    }

    // 4. Generate watermark menggunakan Sharp
    const watermarkedBuffer = await addWatermark(originalBuffer, eventName);

    // 5. Upload ke Supabase Storage
    const fileUUID = crypto.randomUUID();
    const fileExt = file.name.split('.').pop() || 'jpg';

    // Path unik di storage
    const originalPath = `events/${eventId}/${fileUUID}_original.${fileExt}`;
    const watermarkPath = `events/${eventId}/${fileUUID}_watermark.${fileExt}`;

    const originalBucket = process.env.SUPABASE_PRIVATE_BUCKET || 'photo-originals';
    const watermarkBucket = process.env.SUPABASE_PUBLIC_BUCKET || 'photo-watermarks';

    // Upload berkas asli (Private) & watermark (Public)
    console.log(`Uploading files for event ${eventId} to Supabase...`);
    const originalUrlPath = await uploadToStorage(originalBucket, originalPath, originalBuffer, file.type);
    const watermarkUrl = await uploadToStorage(watermarkBucket, watermarkPath, watermarkedBuffer, file.type);

    // 6. Hubungi Python OCR Backend API untuk deteksi bib number
    let detectedBibs: { bib: string; bbox: number[] }[] = [];
    let lowConfidenceBibs: { bib: string; confidence: number; bbox: number[] }[] = [];
    const ocrApiUrl = process.env.OCR_API_URL || 'http://127.0.0.1:8000';

    try {
      console.log(`Calling Python OCR microservice at ${ocrApiUrl}/detect-bib...`);

      const ocrFormData = new FormData();
      // Kirim data buffer foto asli ke API Python
      const ocrBlob = new Blob([new Uint8Array(originalBuffer)], { type: file.type });
      ocrFormData.append('image', ocrBlob, file.name);
      if (model) {
        ocrFormData.append('model', model);
      }

      const ocrResponse = await fetch(`${ocrApiUrl}/detect-bib`, {
        method: 'POST',
        body: ocrFormData,
        // Set timeout pendek agar Next.js tidak crash jika Python mati
        signal: AbortSignal.timeout(10000),
      });

      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json();

        if (ocrData.predictions && Array.isArray(ocrData.predictions)) {
          for (const pred of ocrData.predictions) {
            const confidence = pred.confidence ?? 1.0;
            const bbox = pred.bbox || null;
            if (confidence >= 0.75) {
              detectedBibs.push({ bib: pred.bib, bbox });
            } else {
              lowConfidenceBibs.push({ bib: pred.bib, confidence, bbox });
            }
          }
        } else {
          const legacyBibs = ocrData.bibs || [];
          detectedBibs = legacyBibs.map((b: string) => ({ bib: b, bbox: null }));
          if (ocrData.low_confidence_bibs && Array.isArray(ocrData.low_confidence_bibs)) {
            lowConfidenceBibs = ocrData.low_confidence_bibs.map((b: any) => ({
              bib: b.bib || b.number,
              confidence: b.confidence ?? 0.5,
              bbox: b.bbox || null
            }));
          }
        }

        console.log(`OCR Result for ${file.name}:`, { detectedBibs, lowConfidenceBibs });
      } else {
        console.warn('Python OCR API returned error status:', ocrResponse.status);
      }
    } catch (ocrErr) {
      console.warn('Gagal menghubungi Python OCR API. Lewati deteksi otomatis.', ocrErr);
    }

    // 7. Simpan foto ke database
    const savedPhoto = await insertPhoto(eventId, originalUrlPath, watermarkUrl);

    // 8. Petakan bib numbers yang terdeteksi ke database
    if (detectedBibs.length > 0) {
      for (const item of detectedBibs) {
        await mapPhotoToBib(eventId, savedPhoto.id, item.bib, item.bbox);
      }
    }

    // 9. Simpan low confidence bibs ke unrecognized_bibs untuk review admin (termasuk deteksi kosong dengan box)
    if (lowConfidenceBibs.length > 0) {
      for (const lowBib of lowConfidenceBibs) {
        const cleanBib = (lowBib.bib || '').trim();
        // Simpan jika ada teks ATAU jika ada bounding box untuk dideteksi manual
        if (cleanBib || (lowBib.bbox && lowBib.bbox.length === 4)) {
          await insertUnrecognizedBib(savedPhoto.id, cleanBib, lowBib.confidence, lowBib.bbox);
        }
      }
    }

    // Invalidate search cache for this event since a new photo has been uploaded
    invalidateSearchCache(eventId);

    return NextResponse.json(
      {
        success: true,
        photo: savedPhoto,
        detected_bibs: detectedBibs.map(d => d.bib).filter(Boolean),
        unrecognized_bibs: lowConfidenceBibs,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Photo Upload API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process and upload image: ' + error.message },
      { status: 500 }
    );
  }
}

// ENDPOINT: HAPUS FOTO DARI EVENT (Hanya Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.id, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const photoIdStr = searchParams.get('photo_id');

    if (!photoIdStr) {
      return NextResponse.json({ error: 'photo_id parameter is required' }, { status: 400 });
    }

    const photoId = parseInt(photoIdStr, 10);
    if (isNaN(photoId)) {
      return NextResponse.json({ error: 'Invalid photo_id' }, { status: 400 });
    }

    // 1. Ambil path file original dan watermark dari DB
    const photo = await getPhotoByIdAndEvent(photoId, eventId);

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found in this event' }, { status: 404 });
    }

    const { original_url, watermark_url } = photo;

    // 2. Hapus file fisik dari Supabase Storage
    const originalBucket = process.env.SUPABASE_PRIVATE_BUCKET || 'photo-originals';
    const watermarkBucket = process.env.SUPABASE_PUBLIC_BUCKET || 'photo-watermarks';

    console.log(`Deleting files for photo #${photoId} from Supabase Storage...`);
    await deleteFromStorage(originalBucket, original_url);

    // Watermark url menyimpan public URL penuh (https://[proj].supabase.co/storage/v1/object/public/[bucket]/[path])
    // Kita perlu mengambil path-nya saja (yaitu semua setelah nama bucket)
    const watermarkPrefix = `/storage/v1/object/public/${watermarkBucket}/`;
    const watermarkPathIndex = watermark_url.indexOf(watermarkPrefix);
    let watermarkPath = watermark_url;
    if (watermarkPathIndex !== -1) {
      watermarkPath = watermark_url.substring(watermarkPathIndex + watermarkPrefix.length);
    }

    await deleteFromStorage(watermarkBucket, watermarkPath);

    // 3. Hapus data dari database
    // photo_bibs akan terhapus otomatis karena ON DELETE CASCADE
    // order_items akan ter-set NULL karena ON DELETE SET NULL
    await deletePhoto(photoId, eventId);

    // Invalidate search cache for this event since a photo was deleted
    invalidateSearchCache(eventId);

    console.log(`Photo #${photoId} deleted successfully.`);
    return NextResponse.json({ success: true, message: 'Photo deleted successfully' });

  } catch (error: any) {
    console.error('Delete Photo API Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo: ' + error.message },
      { status: 500 }
    );
  }
}

// ENDPOINT: UPDATE FOTO (Hanya Admin) - Mengubah harga kustom per foto
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.id, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
  }

  try {
    const { photo_id, price } = await req.json();

    if (!photo_id) {
      return NextResponse.json({ error: 'photo_id is required' }, { status: 400 });
    }

    const parsedPhotoId = parseInt(photo_id, 10);
    if (isNaN(parsedPhotoId)) {
      return NextResponse.json({ error: 'Invalid photo_id' }, { status: 400 });
    }

    // price can be empty (NULL) or numeric
    let finalPrice: number | null = null;
    if (price !== undefined && price !== null && price !== '') {
      finalPrice = parseFloat(price);
      if (isNaN(finalPrice) || finalPrice < 0) {
        return NextResponse.json(
          { error: 'Harga foto harus berupa angka positif yang valid.' },
          { status: 400 }
        );
      }
    }

    const photo = await updatePhotoPrice(parsedPhotoId, finalPrice, eventId);

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found in this event' }, { status: 404 });
    }

    // Invalidate search cache for this event since photo metadata was updated
    invalidateSearchCache(eventId);

    return NextResponse.json({ success: true, photo });
  } catch (error: any) {
    console.error('Failed to update photo price:', error);
    return NextResponse.json(
      { error: 'Failed to update photo: ' + error.message },
      { status: 550 }
    );
  }
}
