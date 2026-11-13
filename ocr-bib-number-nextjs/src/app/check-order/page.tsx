'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, Download, Zap } from 'lucide-react';
import { Button } from 'src/components/ui/button';

interface OrderDetails {
  order_id: string;
  payment_status: string;
  download_token: string;
  total_amount: string;
  created_at: string;
}

export default function CheckOrderPage() {
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/check-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, order_id: orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mencari transaksi');
      }

      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600/10 selection:text-blue-600">
      
      {/* ================= HEADER / NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Foto in<span className="text-blue-600"> Aja</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-4 h-9">
              <Link href="/check-order">Cek Pesanan</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors px-4 h-9 shadow-sm">
              <Link href="/#search-section">Cari Foto</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 py-16 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Heading */}
          <div className="text-center mb-8 space-y-2">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
              <Search className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cek Pesanan</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Lacak status transaksi dan dapatkan kembali tautan unduh dokumen foto Anda.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Pencarian */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Alamat Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Alamat email saat transaksi"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Order ID
              </label>
              <input
                type="text"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Contoh: BIB-1688000..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm font-mono"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
            >
              {isLoading ? 'Mencari data...' : 'Lacak Order'}
            </Button>
          </form>

          {/* HASIL PENCARIAN ORDER */}
          {order && (
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-350">
              <h3 className="font-bold text-slate-900 text-base">Hasil Pencarian:</h3>
              
              <div className="p-4 bg-slate-50 border border-slate-250 rounded-xl space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-550">Order ID:</span>
                  <span className="font-mono font-bold text-slate-800">{order.order_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-550">Tanggal Transaksi:</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                      dateStyle: 'medium',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-550">Total Pembayaran:</span>
                  <span className="font-bold text-slate-800">
                    Rp {parseFloat(order.total_amount).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-550">Status Pembayaran:</span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase border ${
                    order.payment_status === 'settlement' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                      : 'bg-amber-50 text-amber-700 border-amber-250'
                  }`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>

              {order.payment_status === 'settlement' ? (
                <Button
                  asChild
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
                >
                  <Link href={`/download/${order.download_token}`} className="flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Unduh Foto Saya Sekarang</span>
                  </Link>
                </Button>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl leading-relaxed border border-amber-200">
                  Status pembayaran Anda belum diselesaikan. Jika Anda baru saja membayar, mohon tunggu beberapa menit lalu lacak order Anda kembali.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ================= FOOTER PLATFORM ================= */}
      <footer className="bg-white mt-auto border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1 rounded text-white">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">Foto in Aja</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
                Platform pencarian otomatis dokumentasi lari berbasis OCR cerdas. Dikembangkan untuk pemenuhan tugas akhir akademis.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Akses Menu</h4>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li><Link href="/#search-section" className="hover:text-blue-600 transition-colors">Portal Cari Pelari</Link></li>
                <li><Link href="/check-order" className="hover:text-blue-600 transition-colors">Lacak Invoice</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Integrasi Server</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>YOLOv11 & YOLOv26 Object Vision</li>
                <li>PaddleOCR Text Core</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metode Pembayaran</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>Midtrans Snap Payment</li>
                <li>Semua Metode Pembayaran Tersedia</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} Foto in Aja. All rights reserved.</p>
            <p className="text-slate-400/80">Powered by Next.js & Python API</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
