'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Badge } from 'src/components/ui/badge';
import { Card } from 'src/components/ui/card';
import { Skeleton } from 'src/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'src/components/ui/dialog';

interface BibDetail {
  number: string;
  bbox: number[] | null;
}

interface PhotoWithBibs {
  id: number;
  watermark_url: string;
  bibs: string | null;
  bib_details?: BibDetail[] | null;
}

interface GalleryGridProps {
  photos: PhotoWithBibs[];
  bibFilter: string;
  selectedEventId: number;
}

export default function GalleryGrid({ photos, bibFilter, selectedEventId }: GalleryGridProps) {
  const [photosList, setPhotosList] = useState<PhotoWithBibs[]>(photos);
  const [offset, setOffset] = useState<number>(photos.length);
  const [hasMore, setHasMore] = useState<boolean>(photos.length === 12);
  const [loading, setLoading] = useState<boolean>(false);

  const [previewPhoto, setPreviewPhoto] = useState<PhotoWithBibs | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imgSizes, setImgSizes] = useState<{ [photoId: number]: { width: number; height: number } }>({});

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMorePhotos = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const url = `/api/admin/gallery?event_id=${selectedEventId}&bib_number=${encodeURIComponent(bibFilter)}&limit=12&offset=${offset}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch additional photos');
      }
      const data = await response.json();
      if (data.success && data.photos) {
        const newPhotos = data.photos;
        setPhotosList(prev => [...prev, ...newPhotos]);
        setOffset(prev => prev + 12);
        if (newPhotos.length < 12) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching more photos:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset, selectedEventId, bibFilter]);

  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel || !hasMore || loading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMorePhotos();
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
  }, [hasMore, loading, loadMorePhotos]);

  return (
    <div>
      {/* Grid Foto Hasil Deteksi */}
      <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {photosList.map((photo) => {
          const size = imgSizes[photo.id];
          
          // Cari apakah bib yang difilter punya bounding box
          const matchingBib = bibFilter
            ? photo.bib_details?.find(
                (b) =>
                  b.number.toLowerCase() === bibFilter.toLowerCase() &&
                  b.bbox &&
                  b.bbox.length === 4
              )
            : null;

          const hasBbox = matchingBib && matchingBib.bbox && matchingBib.bbox.length === 4;

          let imgStyle: React.CSSProperties = {
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            transition: 'all 0.3s ease',
          };

          if (hasBbox && size && matchingBib.bbox) {
            const [x1, y1, x2, y2] = matchingBib.bbox;

            const boxW = x2 - x1;
            const boxH = y2 - y1;

            // Tambahkan margin 35% di sekitar bbox agar nomor BIB terlihat jelas beserta sedikit backgroundnya
            const marginW = boxW * 0.35;
            const marginH = boxH * 0.35;

            const cropX1 = Math.max(0, x1 - marginW);
            const cropY1 = Math.max(0, y1 - marginH);
            const cropX2 = Math.min(size.width, x2 + marginW);
            const cropY2 = Math.min(size.height, y2 + marginH);

            const cropW = cropX2 - cropX1;
            const cropH = cropY2 - cropY1;

            const wRatio = cropW / size.width;
            const hRatio = cropH / size.height;

            imgStyle = {
              position: 'absolute',
              width: `${(1 / wRatio) * 100}%`,
              height: `${(1 / hRatio) * 100}%`,
              left: `${-(cropX1 / size.width) * (1 / wRatio) * 100}%`,
              top: `${-(cropY1 / size.height) * (1 / hRatio) * 100}%`,
              objectFit: 'fill',
              transition: 'all 0.3s ease',
            };
          }

          const hasAnyBbox = photo.bib_details && photo.bib_details.some(b => b.bbox && b.bbox.length === 4);

          return (
            <Card 
              key={photo.id} 
              className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm group flex flex-col justify-between"
            >
              {/* Image Preview */}
              <div className="aspect-[3/2] w-full bg-slate-100 relative overflow-hidden select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.watermark_url}
                  alt={`Photo ${photo.id}`}
                  style={imgStyle}
                  className={`max-w-none ${!hasBbox ? 'group-hover:scale-[1.02]' : ''} transition-transform duration-350`}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImgSizes(prev => ({
                      ...prev,
                      [photo.id]: { width: img.naturalWidth, height: img.naturalHeight }
                    }));
                  }}
                />
                {hasAnyBbox && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPreviewPhoto(photo);
                      setImgDimensions(null);
                    }}
                    className="absolute inset-0 h-full w-full bg-black/40 opacity-0 group-hover:opacity-100 rounded-none transition-opacity flex items-center justify-center text-white cursor-pointer hover:bg-black/45 hover:text-white"
                    title="Lihat Area Deteksi"
                  >
                    <Eye className="h-6 w-6" />
                  </Button>
                )}
              </div>

              {/* Tag Bib Numbers */}
              <div className="p-4 bg-white flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-mono text-slate-400">ID Foto: #{photo.id}</h4>
                  
                  <div className="mt-3 flex flex-wrap gap-1">
                    {photo.bib_details && photo.bib_details.length > 0 ? (
                      photo.bib_details.map((detail, idx) => {
                        const isMatch = bibFilter && detail.number.toLowerCase() === bibFilter.toLowerCase();
                        return (
                          <Badge 
                            key={`${detail.number}-${idx}`} 
                            className={`px-2 py-0.5 text-[10px] font-bold border rounded-md font-mono flex items-center gap-1 shadow-none ${
                              isMatch
                                ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-500'
                                : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50'
                            }`}
                          >
                            BIB: {detail.number}
                            {detail.bbox && detail.bbox.length === 4 && (
                              <span 
                                className={`w-1.5 h-1.5 rounded-full ${isMatch ? 'bg-white' : 'bg-emerald-500'}`} 
                                title="Memiliki koordinat area deteksi" 
                              />
                            )}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No bib tags</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
                  {hasAnyBbox ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPreviewPhoto(photo);
                        setImgDimensions(null);
                      }}
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-500 font-semibold cursor-pointer flex items-center gap-1 hover:bg-transparent"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Area Deteksi</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-350 italic">Tidak ada bbox</span>
                  )}
                  <Link
                    href={`/admin/events/${selectedEventId}`}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Kelola Foto →
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sentinel Element for IntersectionObserver */}
      {hasMore && <div ref={sentinelRef} className="h-10 w-full" />}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <Card key={`skeleton-${i}`} className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between">
              <Skeleton className="aspect-[3/2] w-full rounded-none" />
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <Skeleton className="h-3 w-1/4 mb-3" />
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* End of Photos Message */}
      {!hasMore && photosList.length > 0 && (
        <div className="text-center py-10 mt-8 border-t border-slate-100">
          <p className="text-slate-400 text-sm font-semibold">Semua foto telah dimuat ({photosList.length} foto)</p>
        </div>
      )}

      {/* MODAL PRATINJAU AREA DETEKSI */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => { if (!open) setPreviewPhoto(null) }}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[95vh] text-left">
          <DialogHeader className="pb-3 border-b border-slate-100 space-y-1">
            <DialogTitle className="text-lg font-bold text-slate-800">Pratinjau Hasil Deteksi (Bbox)</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Menampilkan area bounding box yang berhasil dipetakan untuk nomor dada pelari.
            </DialogDescription>
          </DialogHeader>

          {previewPhoto && (
            <>
              {/* Image Preview Container */}
              <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl overflow-hidden p-4 relative min-h-[300px] my-2">
                <div className="relative inline-block max-w-full max-h-[60vh] overflow-hidden select-none shadow-md border border-slate-200 rounded-xl bg-white">
                  <img
                    src={previewPhoto.watermark_url}
                    alt="Full runner photo"
                    className="max-h-[55vh] max-w-full object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImgDimensions({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }}
                  />

                  {/* Render bounding box overlays */}
                  {previewPhoto.bib_details && imgDimensions && previewPhoto.bib_details.map((detail, index) => {
                    if (!detail.bbox || detail.bbox.length !== 4) return null;
                    
                    const isMatch = bibFilter && detail.number.toLowerCase() === bibFilter.toLowerCase();
                    
                    return (
                      <div
                        key={`${detail.number}-${index}`}
                        style={{
                          position: 'absolute',
                          border: isMatch ? '3px dashed #f59e0b' : '3px solid #3b82f6', // amber-500 or blue-500
                          backgroundColor: isMatch ? 'rgba(245, 158, 11, 0.22)' : 'rgba(59, 130, 246, 0.15)',
                          left: `${(detail.bbox[0] / imgDimensions.width) * 100}%`,
                          top: `${(detail.bbox[1] / imgDimensions.height) * 100}%`,
                          width: `${((detail.bbox[2] - detail.bbox[0]) / imgDimensions.width) * 100}%`,
                          height: `${((detail.bbox[3] - detail.bbox[1]) / imgDimensions.height) * 100}%`,
                          boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                          borderRadius: '4px',
                          pointerEvents: 'none',
                        }}
                      >
                        <span className={`absolute -top-6 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap text-white ${
                          isMatch ? 'bg-amber-500' : 'bg-blue-600'
                        }`}>
                          BIB #{detail.number}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full sm:space-x-0 gap-0">
                <span className="text-xs text-slate-500 font-medium">
                  ID Foto: #{previewPhoto.id} | {previewPhoto.bib_details?.filter(b => b.bbox).length || 0} Area Terdeteksi
                </span>
                <Button
                  onClick={() => setPreviewPhoto(null)}
                  className="px-5 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer border-0 shadow-none"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
