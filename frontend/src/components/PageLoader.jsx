import React from "react";

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAFAF8] dark:bg-[#0A0A0A] pt-28 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Top Header skeleton */}
        <div className="space-y-3">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-96" />
        </div>
        {/* Main Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-3 p-4 border border-gray-100 dark:border-white/5 rounded-xl bg-white dark:bg-[#111111]">
              <div className="skeleton w-full h-[200px]" />
              <div className="skeleton h-4 w-[80%]" />
              <div className="skeleton h-4 w-[60%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
