import React from 'react';
import Link from 'next/link';
import { Coins, Camera, Calendar, Image as ImageIcon } from 'lucide-react';
import { getDashboardStats, getRecentTransactions } from 'src/services/orderService';

export const dynamic = 'force-dynamic';

interface RecentTransaction {
  id: string;
  buyer_email: string;
  payment_status: string;
  total_amount: string;
  created_at: Date;
}

async function getDashboardData() {
  try {
    const [stats, recentTransactions] = await Promise.all([
      getDashboardStats(),
      getRecentTransactions(5)
    ]);

    return {
      totalRevenue: stats.totalRevenue,
      totalPhotosSold: stats.totalPhotosSold,
      totalEvents: stats.totalEvents,
      totalPhotos: stats.totalPhotos,
      recentTransactions: recentTransactions as RecentTransaction[]
    };
  } catch (err) {
    console.error('Error fetching dashboard statistics:', err);
    return {
      totalRevenue: 0,
      totalPhotosSold: 0,
      totalEvents: 0,
      totalPhotos: 0,
      recentTransactions: []
    };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardData();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Utama</h2>
        <p className="text-xs text-slate-500 mt-1">Ringkasan performa penjualan foto dan statistik sistem lari.</p>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:scale-[1.01] hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-emerald-600">
              <Coins className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">Omset</span>
          </div>
          <div className="mt-4 text-left">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Pendapatan</h4>
            <p className="text-xl md:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
              Rp {stats.totalRevenue.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Card 2: Photos Sold */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:scale-[1.01] hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl text-blue-600">
              <Camera className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">Penjualan</span>
          </div>
          <div className="mt-4 text-left">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Foto Terjual</h4>
            <p className="text-xl md:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
              {stats.totalPhotosSold} <span className="text-xs text-slate-400 font-normal">file</span>
            </p>
          </div>
        </div>

        {/* Card 3: Events Count */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:scale-[1.01] hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <div className="bg-purple-50 border border-purple-100 p-2 rounded-xl text-purple-600">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-black text-purple-700 bg-purple-50 border border-purple-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">Event</span>
          </div>
          <div className="mt-4 text-left">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Jumlah Event</h4>
            <p className="text-xl md:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
              {stats.totalEvents} <span className="text-xs text-slate-400 font-normal">aktif</span>
            </p>
          </div>
        </div>

        {/* Card 4: Total Photos Count */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:scale-[1.01] hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <div className="bg-cyan-50 border border-cyan-100 p-2 rounded-xl text-cyan-600">
              <ImageIcon className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-black text-cyan-700 bg-cyan-50 border border-cyan-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">Koleksi</span>
          </div>
          <div className="mt-4 text-left">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Foto</h4>
            <p className="text-xl md:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
              {stats.totalPhotos} <span className="text-xs text-slate-400 font-normal">berkas</span>
            </p>
          </div>
        </div>
      </div>


      {/* Recent Activity Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight text-left">5 Transaksi Terkini</h3>
          <Link
            href="/admin/transactions"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Lihat Semua Transaksi →
          </Link>
        </div>

        {stats.recentTransactions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200/80">
            <p className="text-slate-400 text-xs">Belum ada riwayat transaksi.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                  {stats.recentTransactions.map((tx) => {
                    const statusColors: Record<string, string> = {
                      settlement: 'bg-emerald-50/80 text-emerald-700 border-emerald-100',
                      pending: 'bg-amber-50/80 text-amber-700 border-amber-100',
                      expire: 'bg-slate-50/80 text-slate-500 border-slate-200/80',
                      deny: 'bg-rose-50/80 text-rose-700 border-rose-100',
                    };
                    const statusClass = statusColors[tx.payment_status] || 'bg-slate-50/80 text-slate-500 border-slate-200/80';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString('id-ID', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-900">
                          {tx.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {tx.buyer_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-black text-blue-600">
                          Rp {parseFloat(tx.total_amount).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${statusClass}`}>
                            {tx.payment_status}
                          </span>
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
    </div>
  );
}
