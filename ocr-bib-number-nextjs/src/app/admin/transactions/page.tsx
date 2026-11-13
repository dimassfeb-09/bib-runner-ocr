import React from 'react';
import Link from 'next/link';
import { ExternalLink, Info } from 'lucide-react';
import { getAllTransactions } from 'src/services/orderService';

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  buyer_email: string;
  payment_status: string;
  total_amount: string;
  download_token: string;
  created_at: Date;
  photo_ids: string | null;
}

async function getTransactions(): Promise<OrderRow[]> {
  try {
    return await getAllTransactions();
  } catch (error) {
    console.error('Failed to fetch transaction list:', error);
    return [];
  }
}

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6 text-left">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Riwayat Transaksi</h2>
        <p className="text-xs text-slate-500 mt-1">Daftar pembelian foto lari oleh runner via Midtrans.</p>
      </div>

      {/* Tabel Transaksi */}
      {transactions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200/80">
          <p className="text-slate-600 text-sm font-medium">Belum ada transaksi pembelian.</p>
          <p className="text-slate-400 text-xs mt-1">Semua pembayaran runner via Midtrans akan tercatat secara otomatis di sini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Tanggal & Waktu</th>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Email Pembeli</th>
                  <th className="px-6 py-4">Foto Yang Dibeli</th>
                  <th className="px-6 py-4">Total Biaya</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                {transactions.map((tx) => {
                  // Warna badge berdasarkan status transaksi
                  const statusColors: Record<string, string> = {
                    settlement: 'bg-emerald-50/80 text-emerald-700 border-emerald-100',
                    pending: 'bg-amber-50/80 text-amber-700 border-amber-100',
                    expire: 'bg-slate-50/80 text-slate-500 border-slate-200/80',
                    deny: 'bg-rose-50/80 text-rose-700 border-rose-100',
                    cancel: 'bg-rose-50/80 text-rose-700 border-rose-100',
                  };

                  const statusClass = statusColors[tx.payment_status] || 'bg-slate-50/80 text-slate-500 border-slate-200/80';
                  
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                        {new Date(tx.created_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-900">
                        {tx.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-650">
                        {tx.buyer_email}
                      </td>
                      <td className="px-6 py-4 max-w-[180px] truncate">
                        {tx.photo_ids ? (
                          <div className="flex flex-wrap gap-1">
                            {tx.photo_ids.split(', ').map((id) => (
                              <span key={id} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded text-slate-500 text-[10px] font-bold font-mono">
                                #{id}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-440 italic">Tidak ada foto</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-black text-blue-600">
                        Rp {parseFloat(tx.total_amount).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${statusClass}`}>
                          {tx.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/transactions/${tx.id}`}
                            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-bold hover:underline"
                          >
                            <span>Detail</span>
                          </Link>
                          {tx.payment_status === 'settlement' && (
                            <>
                              <span className="text-slate-200">|</span>
                              <a
                                href={`/download/${tx.download_token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-0.5 text-slate-500 hover:text-slate-700 font-semibold hover:underline"
                              >
                                <span>Unduh</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


