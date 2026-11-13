'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Check, AlertCircle, X, Clock, UploadCloud } from 'lucide-react';

interface UploadPhotoZoneProps {
  eventId: number;
}

interface UnrecognizedBib {
  bib: string;
  confidence: number;
  bbox: number[] | null;
}

interface UploadStatus {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  detectedBibs?: string[];
  unrecognizedBibs?: UnrecognizedBib[];
  errorMsg?: string;
}

export default function UploadPhotoZone({ eventId }: UploadPhotoZoneProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadList, setUploadList] = useState<UploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('split9010_yolo26s');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    // Filter hanya tipe gambar
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    const initialList = imageFiles.map(file => ({
      fileName: file.name,
      status: 'pending' as const,
    }));

    setUploadList(initialList);
    setIsOpen(true);
    startUpload(imageFiles);
  };

  const startUpload = async (files: File[]) => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update status menjadi uploading
      setUploadList(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'uploading' } : item
      ));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', selectedModel);

        const response = await fetch(`/api/admin/events/${eventId}/photos`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload image');
        }

        // Sukses
        setUploadList(prev => prev.map((item, idx) =>
          idx === i ? {
            ...item,
            status: 'success',
            detectedBibs: data.detected_bibs,
            unrecognizedBibs: data.unrecognized_bibs
          } : item
        ));
      } catch (err: any) {
        console.error(err);
        setUploadList(prev => prev.map((item, idx) =>
          idx === i ? {
            ...item,
            status: 'error',
            errorMsg: err.message || 'Gagal memproses'
          } : item
        ));
      }
    }

    setIsProcessing(false);
    // Refresh Server Component agar foto-foto terbaru tampil di grid
    router.refresh();
  };

  const completedUploads = uploadList.filter(item => item.status === 'success');
  const totalPhotos = uploadList.length;

  let successOcrCount = 0;
  let lowConfidenceCount = 0;
  let failedOcrCount = 0;
  let notDetectedCount = 0;
  let detectedPhotosCount = 0;

  completedUploads.forEach(item => {
    const hasDetected = !!(item.detectedBibs && item.detectedBibs.length > 0);
    const hasUnreg = !!(item.unrecognizedBibs && item.unrecognizedBibs.length > 0);

    if (hasDetected && item.detectedBibs) {
      successOcrCount += item.detectedBibs.length;
    }
    
    if (hasUnreg && item.unrecognizedBibs) {
      item.unrecognizedBibs.forEach(u => {
        if ((u.bib || '').trim() !== '') {
          lowConfidenceCount++;
        } else {
          failedOcrCount++;
        }
      });
    }

    if (hasDetected || hasUnreg) {
      detectedPhotosCount++;
    } else {
      notDetectedCount++;
    }
  });

  return (
    <>
      {/* Tombol memicu upload */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-left">
        {/* Dropdown Model YOLO */}
        <div className="flex items-center space-x-2 flex-1">
          <label htmlFor="model-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0">
            Model:
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-none"
          >
            <option value="split9010_yolo26s">YOLO26s (Split 90:10) - Rekomendasi</option>
            <option value="split8020_yolo26s">YOLO26s (Split 80:20)</option>
            <option value="split7030_yolo26s">YOLO26s (Split 70:30)</option>
            <option value="split9010_yolo11s">YOLO11s (Split 90:10)</option>
            <option value="split8020_yolo11s">YOLO11s (Split 80:20)</option>
            <option value="split7030_yolo11s">YOLO11s (Split 70:30)</option>
          </select>
        </div>

        {/* Tombol memicu upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shrink-0 cursor-pointer border-0 shadow-sm"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Foto Baru</span>
        </button>
      </div>

      {/* Input file tersembunyi */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {/* MODAL STATUS UPLOAD */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl relative flex flex-col max-h-[85vh] text-left">
            <h3 className="text-lg font-bold text-slate-900">Unggah & Deteksi Bib Number</h3>
            <p className="text-slate-400 text-xs mt-1 mb-6">
              Sistem sedang memproses watermark dan mendeteksi nomor bib via microservice Python.
            </p>

            {/* Panel Statistik Unggah */}
            {uploadList.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl text-center">
                <div className="flex flex-col justify-center py-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total File</span>
                  <span className="text-base font-black text-slate-800 mt-0.5">{totalPhotos}</span>
                </div>
                <div className="flex flex-col justify-center border-l border-slate-200/60 pl-1 py-1">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Terdeteksi</span>
                  <span className="text-base font-black text-blue-600 mt-0.5">{detectedPhotosCount} <span className="text-[9px] font-medium text-slate-400">foto</span></span>
                </div>
                <div className="flex flex-col justify-center border-l border-slate-200/60 pl-1 py-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tak Terbaca</span>
                  <span className="text-base font-black text-slate-500 mt-0.5">{notDetectedCount} <span className="text-[9px] font-medium text-slate-400">foto</span></span>
                </div>
                <div className="flex flex-col justify-center border-l border-slate-200/60 pl-1 py-1">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">OCR Sukses</span>
                  <span className="text-base font-black text-emerald-600 mt-0.5">{successOcrCount} <span className="text-[9px] font-medium text-slate-400">BIB</span></span>
                </div>
                <div className="flex flex-col justify-center border-l border-slate-200/60 pl-1 py-1">
                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">OCR Gagal</span>
                  <span className="text-base font-black text-rose-600 mt-0.5">{failedOcrCount + lowConfidenceCount} <span className="text-[9px] font-medium text-slate-400">BIB</span></span>
                </div>
              </div>
            )}

            {/* Area List Foto */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
              {uploadList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.fileName}</p>

                    {/* Status Info */}
                    {item.status === 'uploading' && (
                      <p className="text-xs text-blue-600 animate-pulse mt-1 font-medium">Mengunggah & menjalankan OCR...</p>
                    )}
                    {item.status === 'success' && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        <span className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold mr-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>Proses Selesai</span>
                        </span>
                        
                        {/* 1. Mapped / Detected BIBs (Success) */}
                        {item.detectedBibs && item.detectedBibs.map((bib, bIdx) => (
                          <span key={`det-${bIdx}`} className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded font-mono">
                            BIB: {bib} (Sukses)
                          </span>
                        ))}
                        
                        {/* 2. Unrecognized / OCR Failed BIBs */}
                        {item.unrecognizedBibs && item.unrecognizedBibs.map((unreg, uIdx) => {
                          const cleanBib = (unreg.bib || '').trim();
                          if (cleanBib) {
                            return (
                              <span key={`unreg-${uIdx}`} className="px-2 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded font-mono" title={`Akurasi rendah: ${Math.round(unreg.confidence * 100)}%`}>
                                BIB: {cleanBib}? (Tinjau)
                              </span>
                            );
                          } else {
                            return (
                              <span key={`unreg-${uIdx}`} className="px-2 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 rounded font-mono">
                                [Gagal Baca OCR]
                              </span>
                            );
                          }
                        })}

                        {/* 3. No objects detected at all */}
                        {(!item.detectedBibs || item.detectedBibs.length === 0) && 
                         (!item.unrecognizedBibs || item.unrecognizedBibs.length === 0) && (
                          <span className="text-[10px] text-slate-400 italic">Tidak ada objek terdeteksi</span>
                        )}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <p className="flex items-center space-x-1 text-xs text-rose-600 mt-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                        <span>Error: {item.errorMsg}</span>
                      </p>
                    )}
                    {item.status === 'pending' && (
                      <p className="text-xs text-slate-400 mt-1 font-medium">Mengantri...</p>
                    )}
                  </div>

                  {/* Status Indicator Icon */}
                  <div className="flex-shrink-0">
                    {item.status === 'uploading' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                    )}
                    {item.status === 'success' && (
                      <Check className="h-5 w-5 text-emerald-600 stroke-[3]" />
                    )}
                    {item.status === 'error' && (
                      <X className="h-5 w-5 text-rose-500 stroke-[3]" />
                    )}
                    {item.status === 'pending' && (
                      <Clock className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                disabled={isProcessing}
                onClick={() => setIsOpen(false)}
                className="px-5 h-9 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100/40 disabled:text-slate-400 text-slate-700 font-semibold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer border-0"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Area Box di Halaman Utama */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          mt-4
          border border-dashed
          rounded-2xl
          p-8
          text-center
          transition-all
          cursor-pointer
          ${dragActive
            ? 'border-blue-500 bg-blue-50/40 shadow-inner'
            : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
          }
        `}
      >
        <UploadCloud className="h-8 w-8 mx-auto text-slate-400 group-hover:text-blue-500 transition-colors" />

        <p className="mt-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Tarik & Lepas Foto Di Sini
        </p>

        <p className="text-[10px] text-slate-400 mt-1 font-medium">
          Mendukung format JPG, PNG dalam jumlah banyak
        </p>
      </div>
    </>
  );
}

