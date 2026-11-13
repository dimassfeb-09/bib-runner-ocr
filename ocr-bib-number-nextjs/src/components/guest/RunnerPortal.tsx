'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Event } from 'src/types';
import { Search, Camera, Check, ShoppingCart, CreditCard, Calendar, Hash, Trash2, Eye, RefreshCw, Zap, Square, CheckSquare } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Badge } from 'src/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'src/components/ui/select';

interface RunnerPortalProps {
  initialEvents: Event[];
  defaultEventId?: string;
  defaultBibNumber?: string;
}

interface PhotoResult {
  id: number;
  watermark_url: string;
  price: number;
  bbox?: number[] | null;
}

export default function RunnerPortal({
  initialEvents,
  defaultEventId,
  defaultBibNumber,
}: RunnerPortalProps) {
  const router = useRouter();
  const [events] = useState<Event[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    defaultEventId || initialEvents[0]?.id.toString() || ''
  );
  const [bibNumber, setBibNumber] = useState<string>(defaultBibNumber || '');
  const [photos, setPhotos] = useState<PhotoResult[]>([]);
  const [bundlePrice, setBundlePrice] = useState<number>(100000);
  const [cart, setCart] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchTriggered, setSearchTriggered] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoResult | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(new Set());
  
  // Client-side cache to avoid redundant API hits for the same event and BIB number
  const searchCacheRef = React.useRef<Record<string, { photos: PhotoResult[]; bundlePrice: number }>>({});

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('foto_in_aja_selected_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCart(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('foto_in_aja_selected_cart', JSON.stringify(Array.from(cart)));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEventId) return;

    const cleanBib = bibNumber.trim();
    if (!cleanBib) {
      setPhotos([]);
      setSearchTriggered(false);
      return;
    }

    // Check client-side cache first
    const cacheKey = `${selectedEventId}_${cleanBib}`;
    if (searchCacheRef.current[cacheKey]) {
      const cached = searchCacheRef.current[cacheKey];
      setPhotos(cached.photos);
      setBundlePrice(cached.bundlePrice);
      setSearchTriggered(true);
      return;
    }

    setIsSearching(true);
    setSearchTriggered(true);

    try {
      const url = `/api/search?event_id=${selectedEventId}&bib_number=${encodeURIComponent(cleanBib)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const loadedPhotos = data.photos || [];
        const loadedBundlePrice = data.bundlePrice !== undefined ? data.bundlePrice : bundlePrice;
        
        setPhotos(loadedPhotos);
        if (data.bundlePrice !== undefined) {
          setBundlePrice(loadedBundlePrice);
        }

        // Save to client-side cache
        searchCacheRef.current[cacheKey] = {
          photos: loadedPhotos,
          bundlePrice: loadedBundlePrice,
        };
      } else {
        console.error('Search failed:', data.error);
        setPhotos([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setPhotos([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedEventId, bibNumber, bundlePrice]);

  useEffect(() => {
    if (!bibNumber.trim()) {
      setPhotos([]);
      setSearchTriggered(false);
      return;
    }

    // Debounce search by 500ms to prevent multiple API requests while typing
    const handler = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [selectedEventId, bibNumber, handleSearch]);

  const toggleCart = (photoId: number) => {
    const newCart = new Set(cart);
    if (newCart.has(photoId)) {
      newCart.delete(photoId);
      // clean up selection
      const nextRemoval = new Set(selectedForRemoval);
      nextRemoval.delete(photoId);
      setSelectedForRemoval(nextRemoval);
    } else {
      newCart.add(photoId);
    }
    setCart(newCart);
  };

  const toggleSelectForRemoval = (photoId: number) => {
    const next = new Set(selectedForRemoval);
    if (next.has(photoId)) {
      next.delete(photoId);
    } else {
      next.add(photoId);
    }
    setSelectedForRemoval(next);
  };

  const removeSelectedFromCart = () => {
    const nextCart = new Set(cart);
    selectedForRemoval.forEach(id => nextCart.delete(id));
    setCart(nextCart);
    setSelectedForRemoval(new Set());
  };

  const selectAllPhotos = () => {
    const newCart = new Set(cart);
    photos.forEach(p => newCart.add(p.id));
    setCart(newCart);
  };

  const unselectAllPhotos = () => {
    const newCart = new Set(cart);
    photos.forEach(p => newCart.delete(p.id));
    setCart(newCart);
  };

  const hasSearchActive = !!(searchTriggered && bibNumber && photos.length > 1);
  const allSearchPhotosInCart = !!(hasSearchActive && photos.every(p => cart.has(p.id)));
  const sumIndividualPrices = photos.reduce((acc, p) => acc + p.price, 0);
  const potentialSavings = sumIndividualPrices - bundlePrice;
  const showBundleBanner = hasSearchActive && potentialSavings > 0;

  const calculateCartTotal = () => {
    if (cart.size === 0) return 0;

    if (allSearchPhotosInCart) {
      const searchPhotoIds = new Set(photos.map(p => p.id));
      let total = bundlePrice;

      Array.from(cart).forEach(photoId => {
        if (!searchPhotoIds.has(photoId)) {
          const photo = photos.find(p => p.id === photoId);
          if (photo) {
            total += photo.price;
          } else {
            total += 50000;
          }
        }
      });
      return total;
    } else {
      let total = 0;
      Array.from(cart).forEach(photoId => {
        const photo = photos.find(p => p.id === photoId);
        if (photo) {
          total += photo.price;
        } else {
          total += 50000;
        }
      });
      return total;
    }
  };

  const handleProceedToCheckout = () => {
    if (cart.size === 0) return;

    const checkoutPhotos = photos
      .filter((p) => cart.has(p.id))
      .map((p) => ({
        id: p.id,
        watermark_url: p.watermark_url,
        price: p.price,
      }));

    const checkoutData = {
      photo_ids: Array.from(cart),
      event_id: selectedEventId ? parseInt(selectedEventId, 10) : undefined,
      eventName: events.find((e) => e.id.toString() === selectedEventId)?.name || '',
      bib_number: bibNumber || undefined,
      photos: checkoutPhotos,
      bundlePrice,
      allSearchPhotosInCart,
      potentialSavings,
    };

    localStorage.setItem('foto_in_aja_cart', JSON.stringify(checkoutData));
    router.push('/checkout');
  };

  return (
    <div className="w-full lg:h-screen text-slate-900 flex flex-col font-sans antialiased lg:overflow-hidden selection:bg-blue-600/10 selection:text-blue-600 bg-[#F8FAFC]">

      {/* ================= HEADER / NAVBAR ================= */}
      <header className="bg-white border-b border-slate-200/85 shrink-0 h-16 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Foto in<span className="text-blue-600"> Aja</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-4 h-9">
              <Link href="/check-order">Cek Pesanan</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors px-4 h-9 shadow-sm">
              <Link href="/#search-section">Cari Foto</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ================= WORKSPACE WRAPPER ================= */}
      <div className="flex-1 flex flex-col lg:flex-row text-left lg:min-h-0 lg:overflow-hidden">

        {/* ================= PANEL KIRI: GALLERY ================= */}
        <main className="flex-1 p-6 lg:p-10 space-y-6 order-1 lg:h-full lg:overflow-y-auto">

          {/* Search Card */}
          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Identifikasi Pelari</h3>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              {/* Event Selector */}
              <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Pilih Kompetisi
                </label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm font-medium h-11 focus:ring-2 focus:ring-blue-500/10 transition-all">
                    <SelectValue placeholder="Pilih Event" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                    {events.length === 0 ? (
                      <SelectItem value="none" disabled>Belum ada event aktif</SelectItem>
                    ) : (
                      events.map(event => (
                        <SelectItem key={event.id} value={event.id.toString()} className="font-medium cursor-pointer">
                          {event.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* BIB Number Input */}
              <div className="flex-1 min-w-[150px] space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-slate-400" /> Nomor Dada (BIB)
                </label>
                <Input
                  type="text"
                  value={bibNumber}
                  onChange={(e) => setBibNumber(e.target.value)}
                  placeholder="Masukkan Nomor BIB"
                  className="w-full h-11 bg-slate-50 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/10 text-sm font-medium"
                />
              </div>

              {/* Search Button */}
              <Button
                type="submit"
                disabled={isSearching}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/80 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm border-0 cursor-pointer shrink-0"
              >
                {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" /> Cari Foto</>}
              </Button>
            </form>
          </div>

          {/* Banner Promo Bundling Terintegrasi */}
          {showBundleBanner && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest uppercase bg-white/20 text-white px-2 py-0.5 rounded">Special Pass</span>
                <h4 className="text-base font-bold tracking-tight mt-1.5">Paket Lengkap Hemat BIB #{bibNumber} Available!</h4>
                <p className="text-xs text-blue-100/80 leading-relaxed max-w-xl">
                  Ambil sekaligus seluruh <span className="font-bold underline">{photos.length} foto</span> Anda dengan tarif flat <span className="font-bold text-white">Rp {bundlePrice.toLocaleString('id-ID')}</span>. Menghemat pengeluaran sebesar <span className="font-bold text-emerald-300">Rp {potentialSavings.toLocaleString('id-ID')}</span>.
                </p>
              </div>
              <Button
                onClick={() => {
                  const newCart = new Set(cart);
                  photos.forEach(p => newCart.add(p.id));
                  setCart(newCart);
                }}
                disabled={allSearchPhotosInCart}
                className="h-11 px-5 bg-white hover:bg-slate-100 disabled:bg-emerald-500 disabled:text-white text-blue-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md border-0"
              >
                {allSearchPhotosInCart ? <><Check className="h-4 w-4 stroke-[3]" /> Diaktifkan</> : 'Klaim Semua'}
              </Button>
            </div>
          )}

          {/* Header Sekaligus Info Status Hasil */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Koleksi Media Kanvas</h2>
              <p className="text-xs text-slate-400">Total terdeteksi oleh core system: {photos.length} Berkas</p>
            </div>

            {photos.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAllPhotos}
                  disabled={photos.every(p => cart.has(p.id))}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 cursor-pointer"
                  title="Pilih Semua Foto"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Pilih Semua</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={unselectAllPhotos}
                  disabled={!photos.some(p => cart.has(p.id))}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 cursor-pointer"
                  title="Batal Pilih Semua"
                >
                  <Square className="h-3.5 w-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Batal Semua</span>
                </Button>
              </div>
            )}
          </div>

          {/* Konten Utama Galeri Grid Multi-Kolom */}
          {isSearching ? (
            <div className="h-[50vh] border border-slate-200/60 bg-white rounded-3xl flex flex-col items-center justify-center shadow-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-4" />
              <p className="text-slate-400 text-xs font-mono">Syncing digital asset server...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="h-[50vh] border border-slate-200/60 bg-white rounded-3xl flex flex-col items-center justify-center px-8 shadow-xs select-none text-center">
              <div className="p-4 bg-slate-50 border border-slate-100 text-slate-300 rounded-2xl mb-4">
                <Camera className="h-6 w-6" />
              </div>
              <h4 className="text-slate-800 font-bold text-sm">
                {searchTriggered ? 'Aset Gambar Tidak Cocok' : 'Kanvas Galeri Kosong'}
              </h4>
              <p className="text-slate-400 text-xs mt-1.5 max-w-xs leading-relaxed">
                {searchTriggered
                  ? 'Parameter deteksi kode dada belum sinkron di server. Mohon periksa kembali nomor BIB Anda.'
                  : 'Silakan isi formulir identifikasi pelari di panel kanan untuk menarik arsip gambar.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => {
                const inCart = cart.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleCart(photo.id)}
                    className={`group relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-100 border transition-all duration-300 cursor-pointer ${inCart ? 'border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.15)] scale-[0.98]' : 'border-transparent hover:scale-[1.01] hover:shadow-md'}`}
                  >
                    {/* Foto Utama Edge-to-Edge */}
                    <img
                      src={photo.watermark_url}
                      alt={`Runner Capture ${photo.id}`}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Gelap Halus untuk Text Visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Indikator Pilihan (Top Corner Floating) */}
                    <div className={`absolute top-3 right-3 h-6 w-6 rounded-lg flex items-center justify-center border text-xs font-bold transition-all ${inCart
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-black/20 border-white/30 text-transparent group-hover:bg-white/90 group-hover:text-slate-500'
                      }`}>
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>

                    {/* ID Foto Terpaku Kiri Atas */}
                    <div className="absolute top-3 left-3 bg-white/10 backdrop-blur-md text-white text-[9px] font-mono px-2 py-0.5 rounded border border-white/10 tracking-widest">
                      #{photo.id}
                    </div>

                    {/* Floating Footer Card Info */}
                    <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between text-white">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block">Single Asset</span>
                        <span className="text-base font-black tracking-tight">Rp {photo.price.toLocaleString('id-ID')}</span>
                      </div>

                      {/* Tombol Preview Pemetaan BBox Bawaan */}
                      {photo.bbox && photo.bbox.length === 4 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPhoto(photo);
                            setImgDimensions(null);
                          }}
                          className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center border-0"
                          title="Lihat Area Deteksi AI"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <aside className="w-full lg:w-[400px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200/80 p-6 flex flex-col shadow-sm z-10 order-2 lg:h-full">
          <div className="flex flex-col h-full justify-between space-y-6">

            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-slate-700">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Keranjang</h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedForRemoval.size > 0 && (
                    <Button
                      variant="ghost"
                      onClick={removeSelectedFromCart}
                      className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-semibold flex items-center gap-1 rounded-lg border-0 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus ({selectedForRemoval.size})</span>
                    </Button>
                  )}
                  <Badge className={`px-2 py-0.5 rounded-md font-mono text-[10px] transition-colors ${cart.size > 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {cart.size} FILE
                  </Badge>
                </div>
              </div>

              {/* Items List (Scrollable if overflowing) */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 py-1 space-y-2">
                {cart.size === 0 ? (
                  <div className="h-full min-h-[150px] border border-dashed border-slate-200 bg-slate-50/50 rounded-xl px-4 flex flex-col items-center justify-center text-center">
                    <p className="text-slate-400 text-xs leading-relaxed">Belum ada foto yang dipilih dari galeri kanvas.</p>
                  </div>
                ) : (
                  Array.from(cart).map((id) => {
                    const photo = photos.find(p => p.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Selection Checkbox */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectForRemoval(id);
                            }}
                            className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${selectedForRemoval.has(id)
                              ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                              : 'border-slate-300 bg-white hover:border-rose-400'
                              }`}
                          >
                            {selectedForRemoval.has(id) && <Check className="h-2.5 w-2.5 stroke-[4] text-white" />}
                          </div>

                          {photo?.watermark_url ? (
                            <img
                              src={photo.watermark_url}
                              alt="Thumbnail"
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200/80 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                              <Camera className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <div className="flex flex-col text-left min-w-0">
                            <span className="font-mono text-xs font-bold text-slate-700 truncate">#IMG-{id}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {photo ? `Rp ${photo.price.toLocaleString('id-ID')}` : 'Foto'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCart(id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus dari keranjang"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Section: Summary & Action Button */}
            <div className="pt-4 border-t border-slate-200/80 space-y-4 shrink-0 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="space-y-2 text-xs">
                {cart.size > 0 && allSearchPhotosInCart ? (
                  <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50/50 px-2.5 py-1.5 rounded-xl">
                    <span>Bundling Flat Rate:</span>
                    <span>Rp {bundlePrice.toLocaleString('id-ID')}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-400 px-1">
                    <span>Metode:</span>
                    <span className="font-medium text-slate-600">Semua Metode (Midtrans)</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 px-1">
                  <span>Total Tagihan:</span>
                  <span className="text-blue-600 text-base font-bold">Rp {calculateCartTotal().toLocaleString('id-ID')}</span>
                </div>
              </div>

              <Button
                onClick={handleProceedToCheckout}
                disabled={cart.size === 0}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border-0 cursor-pointer shadow-sm disabled:cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4" />
                <span>Lanjut ke Checkout</span>
              </Button>
            </div>

          </div>
        </aside>

      </div>

      {/* ================= FLOATING BOTTOM CHECKOUT BAR (MOBILE ONLY) ================= */}
      {cart.size > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 lg:hidden bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl border border-white/10">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cart.size} Foto Terpilih</span>
            <span className="text-base font-black text-white">Rp {calculateCartTotal().toLocaleString('id-ID')}</span>
          </div>
          <Button
            onClick={handleProceedToCheckout}
            className="h-10 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 border-0 cursor-pointer shadow-md"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Lanjut ke Checkout</span>
          </Button>
        </div>
      )}

      {/* ================= MODAL: PRATINJAU AREA DETEKSI BBOX ================= */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => { if (!open) setPreviewPhoto(null) }}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="pb-3 border-b border-slate-100 space-y-1 text-left select-none">
            <DialogTitle className="text-base font-bold text-slate-900">Bbox Detection Mapping</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Frame berwarna merepresentasikan lokasi koordinat objek hasil pembacaan berkas otomatis oleh YOLO.
            </DialogDescription>
          </DialogHeader>

          {previewPhoto && (
            <>
              <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden p-4 relative min-h-[300px] my-3 border border-slate-100">
                <div className="relative inline-block max-w-full max-h-[55vh] overflow-hidden rounded-xl shadow-xs border border-slate-200 bg-white select-none">
                  <img
                    src={previewPhoto.watermark_url}
                    alt="Bbox Visual Analysis"
                    className="max-h-[50vh] max-w-full object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImgDimensions({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }}
                  />
                  {previewPhoto.bbox && previewPhoto.bbox.length === 4 && imgDimensions && (
                    <div
                      className="absolute border-2 border-blue-600 bg-blue-500/20"
                      style={{
                        left: `${(previewPhoto.bbox[0] / imgDimensions.width) * 100}%`,
                        top: `${(previewPhoto.bbox[1] / imgDimensions.height) * 100}%`,
                        width: `${((previewPhoto.bbox[2] - previewPhoto.bbox[0]) / imgDimensions.width) * 100}%`,
                        height: `${((previewPhoto.bbox[3] - previewPhoto.bbox[1]) / imgDimensions.height) * 100}%`,
                        borderRadius: '4px',
                        pointerEvents: 'none',
                      }}
                    >
                      <span className="absolute -top-6 left-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap tracking-wider">
                        BIB: {bibNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
                <span className="text-xs font-mono text-slate-400 tracking-wider select-none">
                  REF_IMAGE_ID: #{previewPhoto.id}
                </span>
                <Button
                  onClick={() => setPreviewPhoto(null)}
                  className="px-4 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl text-xs transition-colors cursor-pointer border-0 shadow-none"
                >
                  Tutup Pratonton
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}