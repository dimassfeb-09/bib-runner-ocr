'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';

interface DeletePhotoButtonProps {
  photoId: number;
  eventId: number;
}

export default function DeletePhotoButton({ photoId, eventId }: DeletePhotoButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/events/${eventId}/photos?photo_id=${photoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh Server Component agar foto terhapus hilang dari grid galeri
        router.refresh();
      } else {
        throw new Error(data.error || 'Gagal menghapus foto');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={isDeleting}
        className="text-xs text-rose-600 hover:text-rose-700 disabled:text-slate-400 font-semibold hover:underline cursor-pointer"
      >
        Hapus
      </button>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Hapus Foto?"
        description={`Apakah Anda yakin ingin menghapus foto #${photoId}? Berkas asli di Supabase Storage juga akan ikut terhapus.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        type="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!errorMsg}
        title="Gagal Menghapus Foto"
        description={errorMsg || ''}
        confirmLabel="Tutup"
        type="danger"
        showCancel={false}
        onConfirm={() => setErrorMsg(null)}
      />
    </>
  );
}

