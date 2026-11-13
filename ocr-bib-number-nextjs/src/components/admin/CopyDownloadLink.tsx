'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface CopyDownloadLinkProps {
  token: string;
}

export default function CopyDownloadLink({ token }: CopyDownloadLinkProps) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const fullUrl = origin ? `${origin}/download/${token}` : `/download/${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin:', err);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Link Unduhan Resmi</p>
        <p className="text-xs font-mono text-slate-600 truncate select-all mt-1">{fullUrl}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`/download/${token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm"
        >
          <span>Buka</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
