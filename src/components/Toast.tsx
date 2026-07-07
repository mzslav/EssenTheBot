import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed top-5 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold"
        style={{
          transform: 'translateX(-50%)',
          maxWidth: '320px',
          width: 'calc(100vw - 32px)',
          background:
            type === 'success'
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          animation: 'toastSlideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <span className="flex-shrink-0">
          {type === 'success' ? <CheckCircle2 size={18} className="text-white" /> : <AlertCircle size={18} className="text-white" />}
        </span>
        <span className="flex-1 leading-snug">{message}</span>
        <button
          onClick={onClose}
          className="opacity-70 hover:opacity-100 text-lg leading-none flex-shrink-0"
        >
          ✕
        </button>
      </div>
      <style>{`
        @keyframes toastSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);   }
        }
      `}</style>
    </>
  );
};

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const hideToast = () => setToast(null);

  return { toast, showToast, hideToast };
}