'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Login sukses, arahkan ke dashboard admin
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans antialiased">
      {/* Background blobs for premium aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.02)] relative">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-blue-600 p-2.5 rounded-xl text-white mb-4 shadow-sm shadow-blue-500/20">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Foto in<span className="text-blue-600"> Aja</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Panel Administrator</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50/80 border border-rose-100/80 text-rose-600 text-xs px-4 py-3 rounded-xl mb-6 flex items-start space-x-2.5">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full px-4 h-11 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full px-4 h-11 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer border-0 mt-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Masuk...</span>
              </>
            ) : (
              <span>Masuk Ke Panel</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

