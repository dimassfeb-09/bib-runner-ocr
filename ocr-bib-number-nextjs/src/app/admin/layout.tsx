'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Image as ImageIcon, 
  CreditCard, 
  Settings as SettingsIcon, 
  Activity,
  LogOut,
  Eye,
  Menu,
  X
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar drawer automatically on navigation change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const getLinkClass = (href: string) => {
    const active = isActive(href);
    return `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
      active
        ? 'bg-blue-600 text-white shadow-sm font-semibold shadow-blue-500/10'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`;
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col justify-between p-6 bg-white">
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div className="text-left">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Activity className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                Foto in<span className="text-blue-600"> Aja</span>
              </span>
            </Link>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase font-bold tracking-widest pl-1">Admin Panel</p>
          </div>
          {/* Mobile close button inside drawer */}
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="space-y-1.5">
          <Link href="/admin" className={getLinkClass('/admin')}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard Utama</span>
          </Link>
          <Link href="/admin/events" className={getLinkClass('/admin/events')}>
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Kelola Event</span>
          </Link>
          <Link href="/admin/gallery" className={getLinkClass('/admin/gallery')}>
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span>Galeri Foto & Bib</span>
          </Link>
          <Link href="/admin/unrecognized" className={getLinkClass('/admin/unrecognized')}>
            <Eye className="h-4 w-4 shrink-0" />
            <span>Review Deteksi BIB</span>
          </Link>
          <Link href="/admin/transactions" className={getLinkClass('/admin/transactions')}>
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Daftar Transaksi</span>
          </Link>
          <Link href="/admin/settings" className={getLinkClass('/admin/settings')}>
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span>Pengaturan</span>
          </Link>
        </nav>
      </div>

      <div className="border-t border-slate-100 pt-4 mt-8">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Administrator</p>
            <p className="text-[10px] text-slate-400 font-medium">Sesi Aktif</p>
          </div>
          <a
            href="/api/admin/logout"
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col md:flex-row relative">
      
      {/* Mobile Top Header (Visible only on screens < md) */}
      <header className="md:hidden w-full h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">
            Foto in<span className="text-blue-600"> Aja</span>
          </span>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Desktop Sidebar (Fixed left, visible only on screens >= md) */}
      <aside className="hidden md:block w-64 h-screen bg-white border-r border-slate-200/60 sticky top-0 left-0 z-30 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay Drawer (Fades/Slides in on mobile when toggled) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          ></div>
          {/* Drawer Menu Panel */}
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full border-r border-slate-200 shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}


