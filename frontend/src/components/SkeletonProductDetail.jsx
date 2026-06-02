export default function SkeletonProductDetail() {
  return (
    <div className="pt-20 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-10 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          <span className="text-[#E8E8E8] dark:text-white/5">/</span>
          <div className="h-3 w-10 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          <span className="text-[#E8E8E8] dark:text-white/5">/</span>
          <div className="h-3 w-20 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-10">
        {/* Image gallery skeleton */}
        <div className="lg:w-1/2">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {/* Thumbnails */}
            <div className="flex sm:flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#F0F0EE] dark:bg-white/5" />
              ))}
            </div>
            {/* Main image */}
            <div className="flex-1 aspect-square rounded-2xl bg-[#F0F0EE] dark:bg-white/5" />
          </div>
        </div>

        {/* Info skeleton */}
        <div className="lg:w-1/2 space-y-5">
          {/* Brand */}
          <div className="h-3 w-32 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          {/* Title */}
          <div className="h-8 w-3/4 bg-[#E8E8E8] dark:bg-white/5 rounded-lg" />
          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="h-6 w-16 bg-[#E8E8E8] dark:bg-white/5 rounded-lg" />
            <div className="h-4 w-24 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          </div>
          {/* Price */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-28 bg-[#E8E8E8] dark:bg-white/5 rounded-lg" />
            <div className="h-5 w-20 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          </div>
          {/* Description lines */}
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
            <div className="h-3 w-5/6 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
            <div className="h-3 w-2/3 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          </div>
          {/* Color options */}
          <div className="flex gap-2 pt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-20 h-10 bg-[#E8E8E8] dark:bg-white/5 rounded-lg" />
            ))}
          </div>
          {/* Add to cart area */}
          <div className="flex gap-3 pt-4">
            <div className="h-12 w-28 bg-[#E8E8E8] dark:bg-white/5 rounded-xl" />
            <div className="h-12 flex-1 bg-[#E8E8E8] dark:bg-white/5 rounded-xl" />
            <div className="h-12 w-12 bg-[#E8E8E8] dark:bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
