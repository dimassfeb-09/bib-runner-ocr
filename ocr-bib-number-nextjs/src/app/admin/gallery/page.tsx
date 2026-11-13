import React from 'react';
import { Event } from 'src/types';
import { Search } from 'lucide-react';
import { getAllEvents } from 'src/services/eventService';
import { getGalleryPhotos } from 'src/services/photoService';
import GalleryGrid from 'src/components/admin/GalleryGrid';

export const dynamic = 'force-dynamic';

interface GalleryProps {
  searchParams: Promise<{ event_id?: string; bib_number?: string }>;
}

async function getEvents(): Promise<Event[]> {
  try {
    return await getAllEvents();
  } catch (error) {
    console.error('Failed to get events for gallery:', error);
    return [];
  }
}

export default async function AdminGalleryPage({ searchParams }: GalleryProps) {
  const resolvedParams = await searchParams;
  const events = await getEvents();

  // Tentukan default event jika parameter kosong
  let selectedEventId = resolvedParams.event_id
    ? parseInt(resolvedParams.event_id, 10)
    : (events[0]?.id || 0);

  const bibFilter = resolvedParams.bib_number || '';

  const photos = selectedEventId > 0
    ? await getGalleryPhotos(selectedEventId, bibFilter, 12, 0)
    : [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6 text-left">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Galeri Foto & Hasil OCR</h2>
        <p className="text-xs text-slate-500 mt-1">Telusuri seluruh foto event dan hasil deteksi bib number lari.</p>
      </div>

      {/* Filter Form (HTML GET Form - Native & Fast) */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
        <form method="GET" action="/admin/gallery" className="grid gap-4 md:grid-cols-12 text-left">
          {/* Dropdown Event */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Lari</label>
            <select
              name="event_id"
              defaultValue={selectedEventId}
              className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition-colors text-sm font-medium"
            >
              {events.length === 0 && <option value="">Belum ada event tersedia</option>}
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>

          {/* Input Nomor Dada */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cari Nomor Dada (Bib)</label>
            <input
              type="text"
              name="bib_number"
              defaultValue={bibFilter}
              placeholder="Contoh: 123 atau kosongkan untuk semua"
              className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors text-sm font-medium font-mono"
            />
          </div>

          {/* Tombol Filter */}
          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer border-0 shadow-sm"
            >
              <Search className="h-4 w-4" />
              <span>Filter Galeri</span>
            </button>
          </div>
        </form>
      </div>

      {/* Grid Foto Hasil Deteksi */}
      {selectedEventId === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200/80">
          <p className="text-slate-600 text-sm font-medium">Tidak ada event tersedia.</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200/80">
          <p className="text-slate-600 text-sm font-medium">Tidak ada foto ditemukan.</p>
          <p className="text-slate-400 text-xs mt-1">
            {bibFilter ? `Foto dengan nomor dada "${bibFilter}" tidak terdeteksi.` : 'Belum ada foto yang diunggah di event ini.'}
          </p>
        </div>
      ) : (
        <GalleryGrid
          key={`${selectedEventId}-${bibFilter}`}
          photos={photos}
          bibFilter={bibFilter}
          selectedEventId={selectedEventId}
        />
      )}
    </div>
  );
}
