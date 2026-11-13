'use client';

import React, { useState } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';

import ConfirmDialog from 'src/components/ui/ConfirmDialog';

interface BibBundlePriceInputProps {
  eventId: number;
  bibNumber: string;
  initialPrice: string | number | null;
}

export default function BibBundlePriceInput({
  eventId,
  bibNumber,
  initialPrice,
}: BibBundlePriceInputProps) {
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
      const response = await fetch(`/api/admin/events/${eventId}/bibs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bib_number: bibNumber,
          price: price === '' ? null : price,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Gagal menyimpan harga bundling');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan sistem saat menyimpan harga bundling BIB');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-slate-400 font-bold uppercase">Harga:</span>
        <div className="relative w-28">
          <span className="absolute left-2.5 top-1.5 text-[9px] font-bold text-slate-400">Rp</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Default"
            className="pl-6 pr-1 py-1 text-[10px] bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition-colors w-full font-bold"
            disabled={isSaving}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-550 disabled:bg-slate-150 rounded-lg transition-colors flex items-center justify-center cursor-pointer border border-slate-200 hover:border-blue-600 h-6 w-6"
          title="Simpan Harga Bundling Kustom"
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : saveSuccess ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Save className="h-3 w-3" />
          )}
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!errorMsg}
        title="Gagal Menyimpan Harga Bundling"
        description={errorMsg || ''}
        confirmLabel="Tutup"
        type="danger"
        showCancel={false}
        onConfirm={() => setErrorMsg(null)}
      />
    </>
  );
}
