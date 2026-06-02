export default function FeatureStrip() {
  return (
    <section className="bg-[#f3f0e6]/50 border-y border-[#3d3522]/15 py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        {[
          { icon: "🚚", title: "Express Delivery", desc: "48-hour guaranteed delivery across India" },
          { icon: "🔒", title: "Secure Payments", desc: "256-bit SSL encrypted checkout" },
          { icon: "↩️", title: "Easy Returns", desc: "Hassle-free 30-day return policy" },
          { icon: "💎", title: "Authentic Products", desc: "100% genuine guaranteed items" },
        ].map(f => (
          <div key={f.title} className="flex items-start gap-4 group">
            <div className="text-2xl group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
            <div>
              <h4 className="font-bold tracking-wide mb-1 text-sm text-[#3d3522]">{f.title}</h4>
              <p className="text-[#3d3522]/60 text-xs leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}