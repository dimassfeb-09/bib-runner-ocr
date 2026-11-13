'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [photoPrice, setPhotoPrice] = useState<string>('50000');
  const [defaultBundlePrice, setDefaultBundlePrice] = useState<string>('100000');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings saat halaman pertama kali dibuka
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/admin/settings');
        const data = await response.json();
        
        if (response.ok) {
          if (data.photo_price) {
            setPhotoPrice(data.photo_price);
          }
          if (data.default_bundle_price) {
            setDefaultBundlePrice(data.default_bundle_price);
          }
        } else {
          console.error('Failed to load settings:', data.error);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const priceNum = parseInt(photoPrice, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      setMessage({ type: 'error', text: 'Harga foto harus berupa angka positif yang valid.' });
      setIsSaving(false);
      return;
    }

    const bundlePriceNum = parseInt(defaultBundlePrice, 10);
    if (isNaN(bundlePriceNum) || bundlePriceNum <= 0) {
      setMessage({ type: 'error', text: 'Harga bundling default harus berupa angka positif yang valid.' });
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'photo_price',
          value: photoPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan harga foto');
      }

      const responseBundle = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'default_bundle_price',
          value: defaultBundlePrice,
        }),
      });

      const dataBundle = await responseBundle.json();

      if (!responseBundle.ok) {
        throw new Error(dataBundle.error || 'Gagal menyimpan harga bundling');
      }

      setMessage({ type: 'success', text: 'Semua pengaturan berhasil diperbarui!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-4"></div>
        <p className="text-slate-400 text-sm">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6 text-left">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Aplikasi</h2>
        <p className="text-xs text-slate-500 mt-1">Konfigurasi parameter operasional dan bisnis portal foto.</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`flex items-start space-x-2.5 p-4 rounded-xl mb-6 border text-xs font-medium text-left ${
          message.type === 'success' 
            ? 'bg-emerald-50/80 border-emerald-100/80 text-emerald-700' 
            : 'bg-rose-50/80 border-rose-100/80 text-rose-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-500" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Settings Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-left">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Photo Price Config */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Harga Jual Foto Default</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tentukan harga satuan foto default yang terpasang di portal publik saat dibeli oleh pelari jika foto tersebut tidak memiliki harga kustom.
              </p>
            </div>

            <div className="relative max-w-xs mt-3">
              <span className="absolute left-4 top-3 text-slate-400 font-bold text-xs">Rp</span>
              <input
                type="number"
                required
                value={photoPrice}
                onChange={(e) => setPhotoPrice(e.target.value)}
                placeholder="50000"
                className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold font-mono"
                disabled={isSaving}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-2">
              *Masukkan angka saja tanpa titik/koma (misal: 50000 untuk Rp 50.000).
            </span>
          </div>

          {/* Bundle Price Config */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Harga Bundling BIB Default</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tentukan harga bundling default untuk membeli semua foto yang terdeteksi dengan BIB yang sama dalam satu event jika event tersebut tidak memiliki harga bundling khusus.
              </p>
            </div>

            <div className="relative max-w-xs mt-3">
              <span className="absolute left-4 top-3 text-slate-400 font-bold text-xs">Rp</span>
              <input
                type="number"
                required
                value={defaultBundlePrice}
                onChange={(e) => setDefaultBundlePrice(e.target.value)}
                placeholder="100000"
                className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold font-mono"
                disabled={isSaving}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-2">
              *Masukkan angka saja tanpa titik/koma (misal: 100000 untuk Rp 100.000).
            </span>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer border-0 shadow-sm"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Pengaturan</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

