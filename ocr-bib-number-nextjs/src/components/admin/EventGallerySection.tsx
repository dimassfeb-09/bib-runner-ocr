'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import DeletePhotoButton from './DeletePhotoButton';
import PhotoPriceInput from './PhotoPriceInput';
import BibBundlePriceInput from './BibBundlePriceInput';
import { Image as ImageIcon, LayoutGrid, Layers, Tag, Search } from 'lucide-react';

interface BibDetail {
  number: string;
  bbox: number[] | null;
  price?: string | number | null;
}

interface PhotoWithBibs {
  id: number;
  watermark_url: string;
  price: string | number | null;
  bibs: string | null;
  bib_details?: BibDetail[] | null;
}

interface EventGallerySectionProps {
  photos: PhotoWithBibs[];
  eventId: number;
}

export default function EventGallerySection({ photos, eventId }: EventGallerySectionProps) {
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Grouping logic
  const groups: { [bib: string]: PhotoWithBibs[] } = {};
  const noBibPhotos: PhotoWithBibs[] = [];

  photos.forEach((photo) => {
    if (photo.bibs && photo.bibs.trim() !== '') {
      const bibList = photo.bibs.split(',').map((b) => b.trim());
      bibList.forEach((bib) => {
        if (!groups[bib]) {
          groups[bib] = [];
        }
        // Avoid duplicates in the same group
        if (!groups[bib].some(p => p.id === photo.id)) {
          groups[bib].push(photo);
        }
      });
    } else {
      noBibPhotos.push(photo);
    }
  });

  // Sort BIB groups numerically/alphabetically
  const sortedBibs = Object.keys(groups).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  // Filter logic
  const cleanSearch = searchQuery.toLowerCase().trim();

  const filteredPhotos = photos.filter((photo) => {
    if (!cleanSearch) return true;
    if (photo.id.toString() === cleanSearch) return true;
    if (photo.bibs && photo.bibs.toLowerCase().includes(cleanSearch)) return true;
    return false;
  });

  const filteredBibs = sortedBibs.filter((bib) => {
    if (!cleanSearch) return true;
    return bib.toLowerCase().includes(cleanSearch);
  });

  // Get custom bundle price of a BIB number from its aggregated details
  const getBibPrice = (bib: string, groupPhotos: PhotoWithBibs[]): string | number | null => {
    const firstPhoto = groupPhotos[0];
    const detail = firstPhoto?.bib_details?.find(d => d.number === bib);
    return (detail && detail.price !== undefined) ? detail.price : null;
  };

  // IntersectionObserver for infinite scroll
  React.useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Increment visibleCount when scrolled to bottom
        setVisibleCount((prev) => Math.min(prev + 12, filteredPhotos.length));
      }
    }, {
      rootMargin: '150px',
    });

    observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [filteredPhotos.length, viewMode]);

  // Reset pagination on search query or view mode change
  React.useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, viewMode]);

  const renderPhotoCard = (photo: PhotoWithBibs) => (
    <div
      key={photo.id}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 text-left"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={photo.watermark_url}
          alt={`Photo ${photo.id}`}
          fill
          unoptimized
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-lg bg-white/95 backdrop-blur px-2 py-1 shadow">
            <DeletePhotoButton photoId={photo.id} eventId={eventId} />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              Photo ID
            </p>
            <p className="font-bold text-slate-900 text-sm">
              #{photo.id}
            </p>
          </div>

          {photo.bibs && (
            <div className="flex flex-wrap gap-1 max-w-[60%] justify-end">
              {photo.bibs.split(', ').map((bib) => (
                <span
                  key={bib}
                  className="px-1.5 py-0.5 bg-blue-50 border border-blue-100/50 rounded text-blue-600 text-[9px] font-bold font-mono"
                >
                  {bib}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
            Custom Price
          </p>
          <PhotoPriceInput
            photoId={photo.id}
            eventId={eventId}
            initialPrice={photo.price}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 px-6 py-5 gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Photo Gallery
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage uploaded race photos and review grouping layouts.
          </p>
        </div>

        {/* Search & Tabs Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari BIB atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-50 border border-slate-200/60 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${viewMode === 'flat'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 bg-transparent'
                }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Semua Foto</span>
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${viewMode === 'grouped'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 bg-transparent'
                }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Group by BIB</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-slate-50 border border-slate-150 p-5">
              <ImageIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-6 text-sm font-bold text-slate-900">
              No Photos Uploaded
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Upload race photos and the system will automatically detect participant bib numbers.
            </p>
          </div>
        ) : viewMode === 'flat' ? (
          filteredPhotos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-xs font-medium">Tidak ada foto cocok dengan pencarian "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredPhotos.slice(0, visibleCount).map(renderPhotoCard)}
              </div>

              {/* Infinite Scroll Sentinel element */}
              {visibleCount < filteredPhotos.length && (
                <div ref={sentinelRef} className="h-14 w-full flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}

              {/* End of results message */}
              {visibleCount >= filteredPhotos.length && filteredPhotos.length > 0 && (
                <div className="text-center py-6 text-xs text-slate-400 font-medium border-t border-slate-100 mt-6">
                  Semua {filteredPhotos.length} foto telah ditampilkan.
                </div>
              )}
            </div>
          )
        ) : (
          <div className="space-y-12">
            {/* BIB Groups list */}
            {filteredBibs.length === 0 && noBibPhotos.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 text-xs font-medium">Tidak ada grup BIB cocok dengan pencarian "{searchQuery}"</p>
              </div>
            )}

            {filteredBibs.map((bib) => {
              const bibPrice = getBibPrice(bib, groups[bib]);
              return (
                <div key={bib} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-blue-500" />
                      <h3 className="font-bold text-slate-900 text-sm font-mono">
                        BIB #{bib}
                      </h3>
                      <span className="text-xs text-slate-400 font-medium">
                        ({groups[bib].length} Foto)
                      </span>
                    </div>
                    {/* Inline price input component */}
                    <BibBundlePriceInput 
                      eventId={eventId} 
                      bibNumber={bib} 
                      initialPrice={bibPrice} 
                    />
                  </div>
                  <div className="grid gap-6 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {groups[bib].map(renderPhotoCard)}
                  </div>
                </div>
              );
            })}

            {/* Photos without BIB tags (only show when not searching or if search is empty) */}
            {!cleanSearch && noBibPhotos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <ImageIcon className="h-4 w-4 text-slate-400" />
                  <h3 className="font-bold text-slate-500 text-sm">
                    Tanpa Terdeteksi BIB
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    ({noBibPhotos.length} Foto)
                  </span>
                </div>
                <div className="grid gap-6 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {noBibPhotos.map(renderPhotoCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
