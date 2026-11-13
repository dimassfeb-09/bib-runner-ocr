import React from "react";
import Link from "next/link";
import { ArrowRight, Search, Cpu, CreditCard, ShieldCheck, Image as ImageIcon, Mail, Zap, CheckCircle } from "lucide-react";
import HomeSearchForm from "src/components/guest/HomeSearchForm";
import { getAllEvents } from "src/services/eventService";
import { Event } from "src/types";
import { Button } from "src/components/ui/button";
import { Card, CardContent } from "src/components/ui/card";

export const dynamic = "force-dynamic";

async function getActiveEvents(): Promise<Event[]> {
  try {
    return await getAllEvents();
  } catch (error) {
    console.error(error);
    return [];
  }
}

const paymentLogos = [
  {
    name: "QRIS",
    icon: (
      <svg className="h-5 w-5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01" strokeLinecap="round" />
      </svg>
    )
  },
  {
    name: "GoPay",
    icon: (
      <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">go</text>
      </svg>
    )
  },
  {
    name: "ShopeePay",
    icon: (
      <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-2.76 0-5-2.24-5-5h2c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 2.76-2.24 5-5 5z" />
      </svg>
    )
  },
  {
    name: "OVO",
    icon: (
      <svg className="h-5 w-5 text-purple-700" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="15.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="black" fontFamily="sans-serif">O</text>
      </svg>
    )
  },
  {
    name: "DANA",
    icon: (
      <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">D</text>
      </svg>
    )
  },
  {
    name: "LinkAja",
    icon: (
      <svg className="h-5 w-5 text-red-650" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">L</text>
      </svg>
    )
  },
  {
    name: "BCA",
    icon: (
      <svg className="h-5 w-5 text-blue-900" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">BCA</text>
      </svg>
    )
  },
  {
    name: "Mandiri",
    icon: (
      <svg className="h-5 w-5 text-blue-800" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <text x="12" y="13" textAnchor="middle" fill="yellow" fontSize="6" fontWeight="bold" fontFamily="sans-serif">MNDR</text>
      </svg>
    )
  },
  {
    name: "BNI",
    icon: (
      <svg className="h-5 w-5 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">BNI</text>
      </svg>
    )
  },
  {
    name: "BRI",
    icon: (
      <svg className="h-5 w-5 text-blue-650" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">BRI</text>
      </svg>
    )
  },
  {
    name: "VISA",
    icon: (
      <svg className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 6h2l2.5 8h-2.1l-.4-1.5H9.8L9.4 14H7.5l2.5-8z" />
        <rect x="2" y="4" width="20" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    name: "Mastercard",
    icon: (
      <svg className="h-5 w-8" viewBox="0 0 32 20" fill="none">
        <circle cx="12" cy="10" r="8" fill="#EB001B" fillOpacity="0.8" />
        <circle cx="20" cy="10" r="8" fill="#F79E1B" fillOpacity="0.8" />
      </svg>
    )
  }
];

export default async function HomePage() {
  const events = await getActiveEvents();

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
              <a href="#search-section">Cari Foto</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="bg-white border-b border-slate-200/60 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Sisi Kiri: Informasi Utama */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Temukan Foto Marathon Anda <br className="hidden sm:inline" />
                Tanpa Perlu Memilah Manual
              </h1>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
                Platform pencarian documentation event lari berbasis kecerdasan buatan. Cukup masukkan nomor dada (BIB) Anda, sistem secara otomatis mengidentifikasi dan mengumpulkan foto Anda dari ribuan berkas fotografer.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm h-11 px-6 shadow-sm transition-colors">
                  <a href="#search-section" className="flex items-center gap-2">
                    Mulai Pencarian Foto
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild className="px-6 h-11 font-semibold rounded-lg text-sm border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors bg-white">
                  <Link href="/check-order">Riwayat Transaksi</Link>
                </Button>
              </div>

              {/* Angka Statistik Pendukung */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-100 max-w-md">
                <div>
                  <p className="text-2xl font-bold text-slate-900">2.5K+</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Total Arsip Foto</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">98%</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Akurasi Deteksi</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">Instan</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Waktu Pemrosesan</p>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Visual Preview Representatif */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden group">
                  <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-sm z-10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Terdeteksi: BIB #1002
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1486218119243-13883505764c?w=1200"
                    alt="Runner Platform Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="pt-3 px-1 flex justify-between items-center text-sm font-medium">
                  <div>
                    <p className="font-bold text-slate-900">Borobudur Marathon</p>
                    <p className="text-xs text-slate-400 font-normal mt-0.5">Resolusi Penuh • Tanpa Watermark</p>
                  </div>
                  <span className="font-bold text-blue-600">Rp 50.000</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= CORE HUB: ENGINE SEARCH SECTION (DIPERLEBAR DI SINI) ================= */}
      <section id="search-section" className="py-20 bg-[#F8FAFC] scroll-mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Pencarian Berdasarkan Nomor Dada
            </h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
              Pilih daftar event lari yang Anda ikuti, kemudian isi nomor BIB Anda untuk menampilkan seluruh dokumentasi foto Anda secara aktual.
            </p>
          </div>

          <div className="w-full">
            <HomeSearchForm events={events} />
          </div>
        </div>
      </section>

      {/* ================= PAYMENT MARQUEE BAND ================= */}
      <section className="py-6 bg-white border-y border-slate-200/50 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Didukung oleh Midtrans — Transaksi Aman, Instan & Otomatis
          </p>
        </div>
        <div className="relative w-full flex items-center overflow-hidden">
          {/* Gradient overlay left & right for soft fading look */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#F8FAFC] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#F8FAFC] to-transparent z-10 pointer-events-none" />
          
          <div className="animate-marquee flex items-center gap-16 py-2">
            {/* First Set of Logos */}
            {paymentLogos.map((logo, index) => (
              <div key={`logo-1-${index}`} className="flex items-center gap-2.5 text-slate-450 hover:text-slate-800 transition-all duration-300">
                <span className="shrink-0">{logo.icon}</span>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-500">{logo.name}</span>
              </div>
            ))}
            {/* Second Set of Logos (for seamless looping) */}
            {paymentLogos.map((logo, index) => (
              <div key={`logo-2-${index}`} className="flex items-center gap-2.5 text-slate-450 hover:text-slate-800 transition-all duration-300">
                <span className="shrink-0">{logo.icon}</span>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-500">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS & FEATURES ================= */}
      <section className="py-16 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Alur Kerja & Keunggulan Sistem
            </h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Infrastruktur terintegrasi dari lintasan hingga berkas digital siap pakai.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <Card className="bg-white border border-slate-200 rounded-xl shadow-none">
              <CardContent className="p-6 space-y-4 text-left">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">1. Identifikasi Cerdas</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Algoritma visi komputer berbasis multi-model (YOLOv11 & YOLOv26) dan PaddleOCR membaca nomor dada pelari secara presisi, meminimalisir kesalahan sortir akibat cuaca atau lipatan kain baju.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-xl shadow-none">
              <CardContent className="p-6 space-y-4 text-left">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">2. Transaksi Terotomatisasi</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Integrasi gerbang pembayaran Midtrans mendukung seluruh metode pembayaran (QRIS, E-Wallet, Virtual Account, & Kartu Kredit) secara real-time untuk pelepasan tautan unduh otomatis.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-xl shadow-none">
              <CardContent className="p-6 space-y-4 text-left">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">3. Berkas Kualitas Asli</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Pelari mendapatkan akses ke berkas resolusi penuh asli dari kamera fotografer tanpa adanya penurunan kompresi kualitas gambar ataupun gangguan watermark kosmetik.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================= TRANSACTION INQUIRY (CTA) ================= */}
      <section className="py-16 bg-white border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-xl p-6 sm:p-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
            <div className="space-y-1.5 text-left">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Ingin Mengunduh Ulang Foto Anda?
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
                Jika Anda telah menyelesaikan transaksi sebelumnya, masukkan ID pesanan Anda untuk mengakses kembali tautan unduhan dokumen di sistem.
              </p>
            </div>

            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm h-10 px-5 transition-colors shrink-0 w-full md:w-auto">
              <Link href="/check-order">
                Periksa Status Pesanan
              </Link>
            </Button>
          </div>
        </div>
      </section>

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
                <li><a href="#search-section" className="hover:text-blue-600 transition-colors">Portal Cari Pelari</a></li>
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