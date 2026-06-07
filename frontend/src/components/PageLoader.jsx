import React from "react";

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0A0A]">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Rotating outer ring */}
        <div className="absolute inset-0 rounded-full border border-t-[#C9A84C] border-r-transparent border-b-transparent border-l-transparent animate-spin duration-1000"></div>
        {/* Subtle background ring */}
        <div className="absolute inset-0 rounded-full border border-white/5"></div>
        {/* Centered T logo */}
        <span 
          className="text-4xl font-bold text-[#C9A84C] font-display select-none tracking-widest"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          T
        </span>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
