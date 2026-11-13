import React from 'react';
import { Order, Photo } from 'src/types';
import { notFound } from 'next/navigation';
import { Clock, Download, Sparkles } from 'lucide-react';
import { getOrderByToken, updatePaymentStatus, getOrderWithPhotosByToken } from 'src/services/orderService';

export const dynamic = 'force-dynamic';

interface DownloadPageProps {
  params: Promise<{ token: string }>;
}

interface PurchasedPhoto {
  id: number;
  watermark_url: string;
}

async function getOrderAndPhotos(token: string): Promise<{
  order: Order | null;
  photos: PurchasedPhoto[];
}> {
  try {
    // 1. Ambil detail order berdasarkan token download
    let order = await getOrderByToken(token);

    if (!order) {
      return { order: null, photos: [] };
    }

    if (order.payment_status === 'pending') {
      try {
        const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
        const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
        
        // Dynamically choose Midtrans Status API URL based on Server Key prefix (starts with 'SB-' for sandbox)
        const isSandbox = serverKey.startsWith('SB-');
        const statusUrl = isSandbox
          ? `https://api.sandbox.midtrans.com/v2/${order.id}/status`
          : `https://api.midtrans.com/v2/${order.id}/status`;
        
        const midtransRes = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': authHeader,
          },
          cache: 'no-store'
        });

        if (midtransRes.ok) {
          const midtransStatus = await midtransRes.json();
          const tStatus = midtransStatus.transaction_status;
          
          if (tStatus === 'settlement' || tStatus === 'capture') {
            await updatePaymentStatus(order.id, 'settlement');
            order.payment_status = 'settlement';
            
            // Kirim email notifikasi link download secara asinkron
            try {
              const { sendDownloadLink } = await import('src/lib/mailer');
              await sendDownloadLink(order.buyer_email, order.download_token, order.id);
            } catch (mailErr) {
              console.error('Gagal mengirim email saat active-sync:', mailErr);
            }
          } else if (['deny', 'cancel', 'expire'].includes(tStatus)) {
            await updatePaymentStatus(order.id, tStatus);
            order.payment_status = tStatus;
          }
        }
      } catch (err) {
        console.error('Error syncing order status with Midtrans API:', err);
      }
    }

    // Jika belum lunas, jangan kembalikan daftar foto
    if (order.payment_status !== 'settlement') {
      return { order, photos: [] };
    }

    // 2. Ambil list foto yang ada di order ini
    const orderWithPhotos = await getOrderWithPhotosByToken(token);

    return {
      order,
      photos: orderWithPhotos ? orderWithPhotos.photos : [],
    };
  } catch (error) {
    console.error('Error fetching download page data:', error);
    return { order: null, photos: [] };
  }
}

export default async function DownloadPage({ params }: DownloadPageProps) {
  const resolvedParams = await params;
  const { token } = resolvedParams;

  const { order, photos } = await getOrderAndPhotos(token);

  if (!order) {
    return notFound();
  }

  // Skenario 1: Pembayaran belum diselesaikan
  if (order.payment_status !== 'settlement') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-md flex flex-col items-center">
          <Clock className="h-12 w-12 text-amber-500 animate-pulse" />
          <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-2">Pembayaran Belum Selesai</h1>
          <p className="text-slate-600 text-sm mb-6">
            Transaksi untuk order <strong>#{order.id}</strong> saat ini berstatus:{' '}
            <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-250">
              {order.payment_status}
            </span>
          </p>
          <p className="text-xs text-slate-550">
            Jika Anda sudah membayar via Midtrans namun status belum berubah, mohon tunggu beberapa menit atau hubungi admin.
          </p>
        </div>
      </div>
    );
  }

  // Skenario 2: Pembayaran sukses, tampilkan tombol download foto asli
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12 selection:bg-blue-600/30">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center md:text-left border-b border-slate-200 pb-8 mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center md:justify-start space-x-3">
            <Sparkles className="h-9 w-9 text-amber-500" />
            <span>Foto Anda Siap Diunduh!</span>
          </h1>
          <p className="text-slate-600 mt-2">
            Terima kasih telah berbelanja. Akses download untuk order <strong>#{order.id}</strong> telah aktif.
          </p>
        </div>

        {/* Grid Foto Pembelian */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col"
            >
              {/* Preview Gambar (Watermarked) */}
              <div className="aspect-[3/2] w-full bg-slate-100 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.watermark_url}
                  alt={`Photo ${photo.id}`}
                  className="object-cover w-full h-full"
                />
              </div>

              {/* Detail & Tombol Download */}
              <div className="p-5 flex flex-col flex-1 justify-between bg-slate-50/50 border-t border-slate-100">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900 text-lg">Foto Lari #{photo.id}</h3>
                  <p className="text-slate-500 text-xs mt-1">Resolusi Tinggi • Tanpa Watermark</p>
                </div>

                {/* Tombol memanggil secure download API route */}
                <a
                  href={`/api/download?token=${token}&photo_id=${photo.id}`}
                  className="w-full text-center px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-all text-sm flex items-center justify-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download File Asli</span>
                </a>
              </div>
            </div>
          ))}
        </div>


        {/* Footer Halaman */}
        <div className="text-center text-slate-500 text-xs mt-16 border-t border-slate-200 pt-8">
          <p>© {new Date().getFullYear()} Foto in Aja. All rights reserved.</p>
          <p className="mt-1 text-slate-400">
            Simpan email atau tautan ini jika Anda ingin mengunduh ulang foto-foto ini di kemudian hari.
          </p>
        </div>
      </div>
    </div>
  );
}
