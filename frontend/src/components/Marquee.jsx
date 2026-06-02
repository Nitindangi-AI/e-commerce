export default function Marquee() {
  return (
    <div className="border-y border-[#3d3522]/10 py-4 overflow-hidden bg-white/45 backdrop-blur-md">
      <div className="marquee">
        {Array(2).fill([
          "FREE SHIPPING OVER ₹5000", "•",
          "AUTHENTIC LUXURY", "•",
          "30-DAY RETURNS", "•",
          "EXCLUSIVE DROPS", "•",
          "SECURE CHECKOUT", "•",
          "HANDCRAFTED QUALITY", "•",
          "WORLDWIDE DELIVERY", "•",
          "MEMBER REWARDS", "•",
        ]).flat().map((t, i) => (
          <span key={i} className={`text-xs tracking-[0.3em] uppercase flex-shrink-0 font-semibold ${t === "•" ? "gold" : "text-[#3d3522]/40"}`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
