import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 p-4 border border-gray-100 rounded-xl bg-white dark:bg-[#111111] dark:border-white/5">
      {/* Image rect: full width, 200px tall */}
      <div className="skeleton w-full h-[200px]" />
      {/* Two text lines: 80% width, 60% width */}
      <div className="skeleton h-4 w-[80%]" />
      <div className="skeleton h-4 w-[60%]" />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
