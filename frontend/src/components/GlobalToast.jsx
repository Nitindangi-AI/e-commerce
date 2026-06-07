import React from 'react';
import { useToastStore } from '../store/useToastStore';

export default function GlobalToast() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  const colors = {
    success: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    error: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
    info: 'bg-[#FDF7E7] text-[#B5963F] border-[#E2CD8A]',
    warning: 'bg-[#FFEDD5] text-[#D97706] border-[#FED7AA]',
  };

  return (
    <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-x-0 animate-slide-in ${colors[t.type] || colors.info}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold font-sans leading-relaxed">{t.message}</span>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity ml-4 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
export { toast } from '../store/useToastStore';
