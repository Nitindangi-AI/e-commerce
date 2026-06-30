import React from 'react';

export default function SkeletonProductDetail() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 pt-28 flex flex-col md:flex-row gap-10">
      {/* Large Image */}
      <div className="w-full md:w-1/2 aspect-square skeleton rounded-2xl min-h-[350px]" />
      
      {/* Product Details Section */}
      <div className="w-full md:w-1/2 space-y-6">
        {/* Title Line */}
        <div className="skeleton h-8 w-[70%]" />
        
        {/* Price Line */}
        <div className="skeleton h-6 w-[35%]" />
        
        {/* Description Block */}
        <div className="space-y-3 pt-4">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-[95%]" />
          <div className="skeleton h-4 w-[90%]" />
          <div className="skeleton h-4 w-[85%]" />
        </div>
      </div>
    </div>
  );
}
