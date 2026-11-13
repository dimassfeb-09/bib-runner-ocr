import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from 'src/lib/supabase';
import { validateDownload } from 'src/services/orderService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const photoIdStr = searchParams.get('photo_id');

    if (!token || !photoIdStr) {
      return NextResponse.json(
        { error: 'Token and photo_id parameters are required' },
        { status: 400 }
      );
    }

    const photoId = parseInt(photoIdStr, 10);
    if (isNaN(photoId)) {
      return NextResponse.json({ error: 'Invalid photo_id' }, { status: 400 });
    }

    // 1. Validasi apakah order dengan token ini SUDAH LUNAS (settlement)
    // dan apakah foto tersebut memang merupakan bagian dari order ini.
    const downloadValidation = await validateDownload(token, photoId);

    if (!downloadValidation) {
      return NextResponse.json(
        { error: 'Invalid download token or photo request' },
        { status: 403 }
      );
    }

    const { payment_status, original_url } = downloadValidation;

    if (payment_status !== 'settlement') {
      return NextResponse.json(
        { error: 'Payment has not been settled yet' },
        { status: 403 }
      );
    }

    // 2. Ambil file asli dari Private Supabase Storage Bucket
    const privateBucket = process.env.SUPABASE_PRIVATE_BUCKET || 'photo-originals';
    
    // original_url menyimpan path file di dalam bucket (misal: "events/1/photo_123.jpg")
    const { data, error } = await supabaseAdmin.storage
      .from(privateBucket)
      .download(original_url);

    if (error || !data) {
      console.error('Failed to download from Supabase Storage:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve original file from storage' },
        { status: 500 }
      );
    }

    // 3. Stream/Return file gambar ke client sebagai unduhan (attachment)
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ambil extension / format gambar (misal jpeg/png)
    const fileExtension = original_url.split('.').pop() || 'jpg';
    const contentType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="FotoInAja_${photoId}.${fileExtension}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Secure download API error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
