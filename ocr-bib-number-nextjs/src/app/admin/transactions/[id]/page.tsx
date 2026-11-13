import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderWithPhotosByOrderId } from 'src/services/orderService';
import CopyDownloadLink from 'src/components/admin/CopyDownloadLink';
import { 
  ChevronRight, 
  LayoutDashboard, 
  Receipt, 
  ArrowLeft, 
  Calendar, 
  Mail, 
  DollarSign, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileImage
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TransactionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  if (!orderId) {
    return notFound();
  }

  const transaction = await getOrderWithPhotosByOrderId(orderId);

  if (!transaction) {
    return notFound();
  }

  // Warna badge berdasarkan status transaksi
  const statusColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    settlement: {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      icon: ShieldCheck
    },
    pending: {
      bg: 'bg-amber-50/80',
      text: 'text-amber-700',
      border: 'border-amber-100',
      icon: AlertCircle
    },
    expire: {
      bg: 'bg-slate-50/80',
      text: 'text-slate-500',
      border: 'border-slate-200/80',
      icon: AlertCircle
    },
    deny: {
      bg: 'bg-rose-50/80',
      text: 'text-rose-700',
      border: 'border-rose-100',
      icon: AlertCircle
    },
    cancel: {
      bg: 'bg-rose-50/80',
      text: 'text-rose-700',
      border: 'border-rose-100',
      icon: AlertCircle
    },
  };

  const statusConfig = statusColors[transaction.payment_status] || {
    bg: 'bg-slate-50/80',
    text: 'text-slate-500',
    border: 'border-slate-200/80',
    icon: AlertCircle
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-8 text-left">
      
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <ChevronRight className="h-3 w-3" />

        <Link
          href="/admin/transactions"
          className="hover:text-slate-900 transition-colors"
        >
          Riwayat Transaksi
        </Link>

        <ChevronRight className="h-3 w-3" />

        <span className="font-semibold text-slate-800 truncate">
          Detail #{transaction.id}
        </span>
      </nav>

      {/* Header / Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Riwayat Transaksi
        </Link>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Invoice / Order details */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-3xl border border-slate-200/60 bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Receipt className="h-3 w-3" /> Transaksi
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 font-mono">
                  #{transaction.id}
                </h1>
              </div>

              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border tracking-wider ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {transaction.payment_status}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
              
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Mail className="h-3.5 w-3.5" /> Email Pembeli
                </span>
                <p className="text-sm font-semibold text-slate-900 break-all">
                  {transaction.buyer_email}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Calendar className="h-3.5 w-3.5" /> Tanggal Transaksi
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(transaction.created_at).toLocaleString('id-ID', {
                    dateStyle: 'long',
                    timeStyle: 'medium',
                  })}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <DollarSign className="h-3.5 w-3.5" /> Total Pembayaran
                </span>
                <p className="text-lg font-black text-blue-600">
                  Rp {Number(transaction.total_amount).toLocaleString('id-ID')}
                </p>
              </div>

              {transaction.updated_at && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Calendar className="h-3.5 w-3.5" /> Terakhir Diperbarui
                  </span>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(transaction.updated_at).toLocaleString('id-ID', {
                      dateStyle: 'long',
                      timeStyle: 'medium',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Token section if paid */}
            {transaction.payment_status === 'settlement' && (
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                <CopyDownloadLink token={transaction.download_token} />
              </div>
            )}

          </div>

          {/* Photo Gallery Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileImage className="h-5 w-5 text-slate-400" />
              Foto Yang Dibeli ({transaction.photos.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Berikut adalah foto-foto yang dipesan dalam transaksi ini.</p>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {transaction.photos.map((photo) => (
              <div key={photo.id} className="group relative rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden">
                  <img
                    src={photo.watermark_url}
                    alt={`Photo #${photo.id}`}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-350"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-white text-[9px] font-bold font-mono">
                    #{photo.id}
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between border-t border-slate-50 bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thumbnail URL</span>
                  <a
                    href={photo.watermark_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    Buka <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right column: Action / Status Card */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Status Transaksi</h3>
            <div className="text-xs text-slate-600 leading-relaxed space-y-3">
              <p>
                Transaksi ini diproses secara otomatis melalui payment gateway Midtrans.
              </p>
              {transaction.payment_status === 'settlement' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Pembayaran Berhasil</span>
                    <span className="text-[11px] text-emerald-700">Runner telah melakukan pembayaran lunas dan dapat mengunduh foto resolusi penuh.</span>
                  </div>
                </div>
              ) : transaction.payment_status === 'pending' ? (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Menunggu Pembayaran</span>
                    <span className="text-[11px] text-amber-700">Runner belum menyelesaikan proses pembayaran di Midtrans.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Transaksi Gagal</span>
                    <span className="text-[11px] text-rose-700">Transaksi telah kedaluwarsa, ditolak, atau dibatalkan.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              {transaction.payment_status === 'settlement' && (
                <a
                  href={`/download/${transaction.download_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Lihat Halaman Unduhan</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
