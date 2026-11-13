'use client';

import React, { useState } from 'react';
import { Tag, Save, Check, Loader2 } from 'lucide-react';

interface EventBundlePriceInputProps {
  eventId: number;
  initialBundlePrice: string | number | null;
}

export default function EventBundlePriceInput({
  eventId,
  initialBundlePrice,
}: EventBundlePriceInputProps) {
  const [bundlePrice, setBundlePrice] = useState<string>(
    initialBundlePrice !== null && initialBundlePrice !== undefined
      ? Math.round(Number(initialBundlePrice)).toString()
      : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bundle_price: bundlePrice === '' ? null : bundlePrice,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        throw new Error(data.error || 'Gagal menyimpan harga bundling');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-xl w-full">
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-blue-500" />
          Harga Bundling Event (BIB)
        </label>
        <p className="text-[11px] text-slate-500">
          Harga jika pelari membeli semua fotonya di event ini. Kosongkan untuk menggunakan harga default global.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start md:self-auto relative">
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">Rp</span>
          <input
            type="number"
            value={bundlePrice}
            onChange={(e) => setBundlePrice(e.target.value)}
            placeholder="Gunakan Default"
            className="pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition-colors w-36 font-semibold"
            disabled={isSaving}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-350 text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm shadow-blue-500/10"
          title="Simpan Harga Bundling"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </button>

        {error && (
          <span className="text-[10px] text-rose-600 font-medium absolute top-full left-0 mt-1 whitespace-nowrap">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
