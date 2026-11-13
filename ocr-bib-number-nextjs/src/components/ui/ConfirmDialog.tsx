import React from 'react';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showCancel?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  type = 'danger',
  onConfirm,
  onCancel = () => {},
  isLoading = false,
  showCancel = true,
}: ConfirmDialogProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
            <AlertTriangle className="h-6 w-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
            <AlertCircle className="h-6 w-6" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <Info className="h-6 w-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onCancel(); }}>
      <DialogContent className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col text-center">
        <div className="pt-4">
          {getIcon()}
          <h3 className="mt-4 text-lg font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed px-2">
            {description}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          {showCancel && (
            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={onCancel}
              className="w-full sm:w-auto h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer border-0 shadow-none"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-full sm:w-auto h-10 px-5 font-semibold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer border-0 shadow-sm flex items-center justify-center gap-1.5 ${getConfirmButtonClass()}`}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
