'use client';

import React, { useState } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';

import ConfirmDialog from 'src/components/ui/ConfirmDialog';

interface PhotoPriceInputProps {
  eventId: number;
  photoId: number;
  initialPrice: string | number | null;
}

export default function PhotoPriceInput({
  eventId,
  photoId,
  initialPrice,
}: PhotoPriceInputProps) {
  const [price, setPrice] = useState<string>(
    initialPrice !== null && initialPrice !== undefined
      ? Math.round(Number(initialPrice)).toString()
      : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/admin/events/${eventId}/photos`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo_id: photoId,
          price: price === '' ? null : price,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Gagal menyimpan harga');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan sistem saat menyimpan harga foto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 mt-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">Rp</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Default"
            className="pl-6 pr-1 py-1.5 text-[11px] bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition-colors w-full font-bold"
            disabled={isSaving}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 disabled:bg-slate-200 rounded-lg transition-colors flex items-center justify-center cursor-pointer border border-slate-200 hover:border-blue-600"
          title="Simpan Harga Kustom"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!errorMsg}
        title="Gagal Menyimpan Harga"
        description={errorMsg || ''}
        confirmLabel="Tutup"
        type="danger"
        showCancel={false}
        onConfirm={() => setErrorMsg(null)}
      />
    </>
  );
}
