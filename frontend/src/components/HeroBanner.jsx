import { Link } from "react-router-dom";

export default function HeroBanner() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-[#FAFAF8] dark:bg-[#0A0A0A]">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C9A84C]/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#C9A84C]/3 rounded-full blur-[140px] pointer-events-none" />

      {/* Grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(200,200,200,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(200,200,200,0.08)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto hero-fade-in">
        {/* Eyebrow */}
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#C9A84C] font-semibold mb-6">
          Premium Fashion · Curated Collections
        </p>

        {/* Main Headline */}
        <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-[#0A0A0A] dark:text-white leading-[0.9] tracking-tight mb-6">
          WEAR THE
          <br />
          <span className="text-[#C9A84C]">TREND.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[#6B6B6B] dark:text-gray-400 text-base md:text-lg font-normal max-w-md mx-auto mb-10 leading-relaxed">
          Premium fashion. Curated for you.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/shop"
            className="bg-[#C9A84C] hover:bg-[#B5963F] text-white px-8 py-4 rounded-full text-xs tracking-[0.2em] uppercase font-bold shadow-[0_4px_16px_rgba(201,168,76,0.25)] hover:shadow-[0_8px_28px_rgba(201,168,76,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            Shop Now
          </Link>
          <Link
            to="/shop"
            className="border border-[#E8E8E8] dark:border-white/10 text-[#111111] dark:text-white hover:border-[#C9A84C] hover:text-[#C9A84C] px-8 py-4 rounded-full text-xs tracking-[0.2em] uppercase font-bold hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            Explore Collections
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[9px] tracking-[0.3em] uppercase text-[#6B6B6B] dark:text-gray-400 font-medium">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#6B6B6B] to-transparent" />
        </div>
      </div>
    </section>
  );
}
