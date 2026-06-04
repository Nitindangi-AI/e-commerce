export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-2xl overflow-hidden shadow-card border border-[#E8E8E8] dark:border-white/5 animate-pulse">
      {/* Image placeholder */}
      <div className="w-full aspect-square bg-[#F0F0EE] dark:bg-white/5" />
      {/* Text area */}
      <div className="p-4 space-y-3">
        {/* Brand line */}
        <div className="h-2.5 w-16 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
        {/* Name line */}
        <div className="h-4 w-3/4 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
        {/* Rating line */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#E8E8E8] dark:bg-white/5 rounded-sm" />
          ))}
          <div className="h-2.5 w-6 bg-[#E8E8E8] dark:bg-white/5 rounded-full ml-1" />
        </div>
        {/* Price line */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
          <div className="h-3 w-14 bg-[#E8E8E8] dark:bg-white/5 rounded-full" />
        </div>
      </div>
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
