export default function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] dark:bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#E8E8E8] dark:border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C9A84C] animate-spin" />
        </div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#6B6B6B] dark:text-gray-400 font-medium">Loading</p>
      </div>
    </div>
  );
}