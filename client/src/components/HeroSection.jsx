import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1400] via-luxe-black to-luxe-black" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-yellow-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-yellow-400/5 blur-3xl" />

      <div className="relative z-10 text-center max-w-5xl mx-auto">
        <p className="text-xs tracking-[0.4em] uppercase gold mb-6 fade-in" style={{ animationDelay: "0.1s" }}>
          New Collection 2026
        </p>
        <h1 className="display text-6xl md:text-8xl lg:text-9xl font-black leading-none mb-8 fade-in" style={{ animationDelay: "0.2s" }}>
          Wear the<br /><span className="gold italic">Extraordinary</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-12 leading-relaxed fade-in" style={{ animationDelay: "0.4s" }}>
          Curated luxury for those who define their own standard. Timeless pieces, uncompromising craft.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in" style={{ animationDelay: "0.6s" }}>
          <Link to="/shop" className="btn-gold px-10 py-4 rounded-full text-sm tracking-widest uppercase inline-block">
            Explore Collection
          </Link>
          <Link to="/shop" className="btn-outline px-10 py-4 rounded-full text-sm tracking-widest uppercase inline-block">
            View Lookbook
          </Link>
        </div>
        <div className="flex items-center justify-center gap-10 mt-20 text-center fade-in" style={{ animationDelay: "0.8s" }}>
          {[["12K+", "Customers"], ["98%", "Satisfaction"], ["48h", "Delivery"]].map(([n, l]) => (
            <div key={l}>
              <div className="display text-3xl font-bold gold">{n}</div>
              <div className="text-white/40 text-xs tracking-widest uppercase mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-px h-12 bg-gradient-to-b from-transparent to-yellow-500/50 mx-auto mb-2" />
        <div className="text-white/30 text-[10px] tracking-widest">SCROLL</div>
      </div>
    </section>
  );
}
