'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Sparkles, Image as ImageIcon, Eye } from 'lucide-react';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';

interface UnrecognizedBib {
  id: number;
  photo_id: number;
  suggested_number: string;
  confidence_score: string;
  status: string;
  created_at: string;
  watermark_url: string;
  event_name: string;
  event_id: number;
  bbox?: number[];
}

export default function UnrecognizedBibsPage() {
  const [items, setItems] = useState<UnrecognizedBib[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [key: number]: string }>({});
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [alertErrorMsg, setAlertErrorMsg] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<UnrecognizedBib | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imgSizes, setImgSizes] = useState<{ [photoId: number]: { width: number; height: number } }>({});
  
  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Fetch pending unrecognized BIBs
  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/unrecognized-bibs');
      const data = await response.json();
      if (response.ok) {
        setItems(data.items || []);
        setVisibleCount(10); // Reset pagination
      } else {
        setError(data.error || 'Gagal mengambil data review BIB');
      }
    } catch (err: any) {
      setError('Terjadi kesalahan jaringan: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // IntersectionObserver for load more
  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 10, items.length));
      }
    }, {
      rootMargin: '100px',
    });

    observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [items.length]);

  const handleNumberChange = (id: number, value: string) => {
    setEditValues({
      ...editValues,
      [id]: value,
    });
  };

  const handleAction = async (id: number, action: 'accept' | 'reject') => {
    setActioningId(id);
    const finalNumber = editValues[id] !== undefined ? editValues[id] : items.find(item => item.id === id)?.suggested_number;

    try {
      const response = await fetch('/api/admin/unrecognized-bibs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action,
          edited_number: finalNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Hapus item dari state setelah sukses dimoderasi
        setItems(items.filter(item => item.id !== id));
        // Hapus juga dari edit values cache
        const newEditValues = { ...editValues };
        delete newEditValues[id];
        setEditValues(newEditValues);
      } else {
        setAlertErrorMsg('Gagal memproses moderasi: ' + data.error);
      }
    } catch (err: any) {
      setAlertErrorMsg('Terjadi kesalahan koneksi: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6 text-left">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Deteksi BIB</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar nomor dada pelari yang terdeteksi dengan tingkat akurasi rendah (di bawah 75%). Anda dapat mengoreksi dan menyetujui, atau menolaknya.
          </p>
        </div>
        <span className="mt-3 sm:mt-0 self-start sm:self-center bg-amber-50 border border-amber-200/50 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold font-mono">
          {items.length} Butuh Review
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-start gap-2 text-left">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-slate-500 text-xs">Memuat data peninjauan...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] px-6">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-4 border border-emerald-100/50">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Semua Selesai!</h3>
          <p className="text-slate-500 text-xs mt-1.5 max-w-sm leading-relaxed">
            Tidak ada nomor dada (BIB) yang memerlukan tinjauan saat ini. Semua hasil deteksi OCR berada di atas ambang batas 75% atau telah diselesaikan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {items.slice(0, visibleCount).map((item) => {
              const isProcessing = actioningId === item.id;
              const currentVal = editValues[item.id] !== undefined ? editValues[item.id] : item.suggested_number;
              const confidencePercent = Math.round(parseFloat(item.confidence_score) * 100);

              const size = imgSizes[item.photo_id];
              const hasBbox = item.bbox && item.bbox.length === 4;

              let imgStyle: React.CSSProperties = {
                objectFit: 'cover',
                width: '100%',
                height: '100%',
                transition: 'all 0.3s ease',
              };

              if (hasBbox && size && item.bbox) {
                const [x1, y1, x2, y2] = item.bbox;

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

              return (
                <div 
                  key={item.id}
                  className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-md hover:scale-[1.01] transition-all duration-300 p-4 flex flex-col sm:flex-row gap-4"
                >
                  {/* Photo Thumbnail */}
                  <div className="w-full sm:w-32 h-32 bg-slate-50 rounded-xl overflow-hidden relative shrink-0 select-none group border border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={item.watermark_url} 
                      alt="Runner Pic" 
                      style={imgStyle}
                      className="max-w-none"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setImgSizes(prev => ({
                          ...prev,
                          [item.photo_id]: { width: img.naturalWidth, height: img.naturalHeight }
                        }));
                      }}
                    />
                    {item.bbox && item.bbox.length === 4 && (
                      <button
                        onClick={() => {
                          setPreviewItem(item);
                          setImgDimensions(null);
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer border-0"
                        title="Lihat Area Deteksi"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-bold font-mono px-1.5 py-0.5 rounded">
                      ID: #{item.photo_id}
                    </div>
                  </div>

                  {/* Meta details & Actions */}
                  <div className="flex-1 flex flex-col justify-between text-left">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {!item.suggested_number ? (
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Gagal Baca OCR
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Akurasi Rendah
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mt-1.5 line-clamp-1">{item.event_name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {!item.suggested_number ? (
                          <span>Deteksi: <span className="font-mono font-bold text-rose-600">Teks Tidak Terbaca</span></span>
                        ) : (
                          <span>Skor Akurasi: <span className={`font-mono font-bold ${confidencePercent < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{confidencePercent}%</span></span>
                        )}
                      </p>
                    </div>

                    {/* Moderation Actions Panel */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">BIB:</span>
                        <input 
                          type="text"
                          value={currentVal}
                          placeholder={!item.suggested_number ? "Isi..." : ""}
                          onChange={(e) => handleNumberChange(item.id, e.target.value)}
                          disabled={isProcessing}
                          className="w-20 h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-center"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => handleAction(item.id, 'accept')}
                          disabled={isProcessing}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-sm border-0"
                          title="Setujui BIB"
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                          <span>Setuju</span>
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'reject')}
                          disabled={isProcessing}
                          className="h-8 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border border-slate-200/50"
                          title="Tolak BIB"
                        >
                          <X className="h-3 w-3 text-rose-600 stroke-[3]" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentinel for infinite scroll pagination */}
          {visibleCount < items.length && (
            <div ref={sentinelRef} className="h-14 w-full flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          )}

          {/* End of results message */}
          {!isLoading && visibleCount >= items.length && items.length > 0 && (
            <div className="text-center py-6 text-xs text-slate-400 font-medium border-t border-slate-100 mt-6">
              Semua {items.length} butuh review telah ditampilkan.
            </div>
          )}
        </div>
      )}

      {/* MODAL PRATINJAU AREA DETEKSI */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Pratinjau Area Deteksi</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Kotak kuning menunjukkan area BIB yang terdeteksi oleh sistem YOLO (YOLOv11/YOLOv26).
                </p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image Preview Container */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl overflow-hidden p-4 relative min-h-[300px]">
              <div className="relative inline-block max-w-full max-h-[60vh] overflow-hidden select-none shadow-md border border-slate-200 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewItem.watermark_url}
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

                {/* Bounding Box Overlay */}
                {previewItem.bbox && previewItem.bbox.length === 4 && imgDimensions && (
                  <div
                    style={{
                      position: 'absolute',
                      border: '3px solid #f59e0b', // amber-500
                      backgroundColor: 'rgba(245, 158, 11, 0.22)',
                      left: `${(previewItem.bbox[0] / imgDimensions.width) * 100}%`,
                      top: `${(previewItem.bbox[1] / imgDimensions.height) * 100}%`,
                      width: `${((previewItem.bbox[2] - previewItem.bbox[0]) / imgDimensions.width) * 100}%`,
                      height: `${((previewItem.bbox[3] - previewItem.bbox[1]) / imgDimensions.height) * 100}%`,
                      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                      borderRadius: '4px',
                      pointerEvents: 'none',
                    }}
                  >
                    <span className="absolute -top-6 left-0 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      BIB Area: {previewItem.suggested_number || 'Tidak Terbaca'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <span className="text-xs text-slate-500 mr-auto font-medium">
                ID Foto: #{previewItem.photo_id} | Koordinat: [{previewItem.bbox?.join(', ')}]
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!alertErrorMsg}
        title="Gagal Memproses Review"
        description={alertErrorMsg || ''}
        confirmLabel="Tutup"
        type="danger"
        showCancel={false}
        onConfirm={() => setAlertErrorMsg(null)}
      />
    </div>
  );
}
