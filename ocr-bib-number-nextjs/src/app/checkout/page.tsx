'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Mail, ShieldCheck, AlertCircle, ShoppingBag, Coins, RefreshCw } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';

interface CheckoutPhoto {
  id: number;
  watermark_url: string;
  price: number;
}

interface CheckoutData {
  photo_ids: number[];
  event_id?: number;
  eventName?: string;
  bib_number?: string;
  photos: CheckoutPhoto[];
  bundlePrice: number;
  allSearchPhotosInCart: boolean;
  potentialSavings: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [email, setEmail] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load cart data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('foto_in_aja_cart');
      if (stored) {
        const parsed = JSON.parse(stored) as CheckoutData;
        if (parsed.photo_ids && parsed.photo_ids.length > 0) {
          setCheckoutData(parsed);
          return;
        }
      }
    } catch (err) {
      console.error('Error reading checkout cart:', err);
    }
    // If no valid cart data, redirect back to home after a slight delay
    setError('Keranjang belanja Anda kosong. Mengalihkan ke halaman pencarian...');
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  const calculateTotal = () => {
    if (!checkoutData) return 0;
    
    if (checkoutData.allSearchPhotosInCart) {
      // Bundling flat rate for search photos, plus any extra items if exist
      const searchPhotoIds = new Set(checkoutData.photos.map(p => p.id));
      let total = checkoutData.bundlePrice;
      
      checkoutData.photos.forEach(photo => {
        if (!searchPhotoIds.has(photo.id)) {
          total += photo.price;
        }
      });
      return total;
    } else {
      return checkoutData.photos.reduce((acc, p) => acc + p.price, 0);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !checkoutData) return;

    setIsCheckingOut(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          photo_ids: checkoutData.photo_ids,
          bib_number: checkoutData.bib_number || undefined,
          event_id: checkoutData.event_id || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to checkout');
      }

      if (data.redirect_url) {
        // Clear local storage cart on success
        localStorage.removeItem('foto_in_aja_cart');
        window.location.href = data.redirect_url;
      } else {
        throw new Error('Gagal mendapatkan URL pembayaran dari Midtrans.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses checkout.');
      setIsCheckingOut(false);
    }
  };

  if (error && !checkoutData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-lg">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Keranjang Kosong</h2>
          <p className="text-slate-500 text-xs leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-4" />
      </div>
    );
  }

  const finalTotal = calculateTotal();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600/10 selection:text-blue-600">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold text-sm">Kembali Cari Foto</span>
          </Link>
          <span className="font-bold text-base tracking-tight text-slate-900">
            Foto in<span className="text-blue-600"> Aja</span>
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Sisi Kiri: Form & Pembayaran */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-md">Pemberitahuan Tagihan</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Selesaikan Pembayaran Anda
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Silakan isi data pengiriman di bawah ini. Tautan unduhan berkualitas penuh tanpa watermark akan dikirimkan langsung ke email Anda setelah transaksi selesai.
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-start space-x-2.5">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" /> Alamat Email Penerima
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@domain.com"
                  className="w-full px-4 h-12 bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500/10 text-sm font-medium"
                  disabled={isCheckingOut}
                />
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Kami akan mengirimkan invoice pembayaran dan link download folder foto digital Anda ke email ini. Pastikan email aktif dan diketik dengan benar.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-xs text-slate-500 leading-normal">
                <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  Sistem pembayaran terenkripsi 256-bit dan dijamin aman menggunakan gerbang resmi <strong>Midtrans Snap Payment API</strong>. Mendukung pembayaran QRIS, e-Wallet, Virtual Account, & transfer bank.
                </span>
              </div>

              <Button
                type="submit"
                disabled={isCheckingOut}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm tracking-wider uppercase transition-colors flex items-center justify-center space-x-2 border-0 cursor-pointer shadow-md"
              >
                {isCheckingOut ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Menghubungkan Server Gateway...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Lanjut ke Pembayaran</span>
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Sisi Kanan: Ringkasan Keranjang */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Ringkasan Pesanan</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                  {checkoutData.photo_ids.length} ITEM
                </span>
              </div>

              {checkoutData.eventName && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Kompetisi</span>
                  <span className="text-xs font-bold text-slate-700">{checkoutData.eventName}</span>
                  {checkoutData.bib_number && (
                    <span className="text-[11px] text-slate-500 block">Nomor BIB Dada: #{checkoutData.bib_number}</span>
                  )}
                </div>
              )}

              {/* Photos List Grid */}
              <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                {checkoutData.photos.map((photo) => (
                  <div key={photo.id} className="flex gap-3 items-center p-2 border border-slate-100 rounded-xl bg-slate-50/50">
                    <img
                      src={photo.watermark_url}
                      alt={`Photo ${photo.id}`}
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200/80"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 truncate">Foto Pelari #{photo.id}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">High Quality Image</p>
                    </div>
                    <span className="text-xs font-bold text-slate-750 shrink-0">
                      Rp {photo.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rincian Harga */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-650">
                <div className="flex justify-between">
                  <span>Subtotal Item:</span>
                  <span>
                    Rp {checkoutData.photos.reduce((acc, p) => acc + p.price, 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {checkoutData.allSearchPhotosInCart && checkoutData.potentialSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium bg-emerald-50/60 px-2.5 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" /> Diskon Bundling:
                    </span>
                    <span>- Rp {checkoutData.potentialSavings.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-slate-900 pt-3 border-t border-slate-100">
                  <span>Total Bayar:</span>
                  <span className="text-blue-600 text-lg">Rp {finalTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
