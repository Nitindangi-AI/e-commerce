import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import HeroBanner from "../../components/HeroBanner";
import Marquee from "../../components/Marquee";
import FeaturedProducts from "../../components/FeaturedProducts";
import FeatureStrip from "../../components/FeatureStrip";
import Newsletter from "../../components/Newsletter";
import DealOfTheDay from "../../components/DealOfTheDay";
import ProductCard from "../../components/ProductCard";
import { useRecentlyViewedStore } from "../../store/useRecentlyViewedStore";
import { productAPI } from "../../services/api";
import localProducts from "../../data/product";

const categories = [
  { name: "Watches", img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=600&auto=format&fit=crop", count: 3 },
  { name: "Eyewear", img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop", count: 3 },
  { name: "Footwear", img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop", count: 3 },
  { name: "Accessories", img: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop", count: 3 },
  { name: "Shirts", img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop", count: 4 },
  { name: "Pants", img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop", count: 2 },
  { name: "Belts", img: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=600&auto=format&fit=crop", count: 2 },
  { name: "Perfumes", img: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=600&auto=format&fit=crop", count: 3 },
];

const testimonials = [
  { name: "Arjun Mehta", role: "Entrepreneur", text: "LUXE has completely changed how I shop for premium accessories. The quality is unmatched.", rating: 5 },
  { name: "Priya Sharma", role: "Fashion Designer", text: "I recommend LUXE to all my clients. The curation is impeccable — every piece tells a story.", rating: 5 },
  { name: "Rahul Verma", role: "Tech Lead", text: "Finally, an Indian brand that delivers true luxury. The Noir Chronograph is my daily companion.", rating: 5 },
];

function CategoryCard({ cat }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Map mouse positions to 3D rotation angles (subtle & elegant)
  const rotateX = useTransform(y, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-5, 5]);

  // Spring values for butter-smooth physical response
  const springX = useSpring(rotateX, { stiffness: 220, damping: 28 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 28 });

  function handleMouseMove(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(normX);
    y.set(normY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{
        rotateX: springX,
        rotateY: springY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="perspective-1000 w-full group relative rounded-3xl overflow-hidden bg-white border border-[#ECE7DD] shadow-[0_4px_16px_rgba(43,43,40,0.03)] hover:shadow-[0_20px_40px_rgba(43,43,40,0.06)] hover:border-[#C6A86B]/40 transition-all duration-300 ease-out"
    >
      <Link to={`/shop?category=${cat.name}`} className="flex flex-col h-full w-full">
        {/* Parallax Image Background - 100% Opacity Spec-Compliant */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F8F6F2]">
          <img 
            src={cat.img} 
            alt={cat.name} 
            loading="lazy" 
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] opacity-100" 
          />
        </div>

        {/* Clean Physical Info Panel (bg white, transitions to #F8F6F2 on hover) */}
        <div className="p-5 bg-white flex flex-col justify-center border-t border-[#ECE7DD] transition-all duration-300 group-hover:bg-[#F8F6F2]">
          <p className="text-[10px] tracking-[0.2em] text-[#C6A86B] font-extrabold uppercase mb-1">{cat.count} Products</p>
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base md:text-lg tracking-tight text-[#2B2B28] group-hover:text-[#5B7FFF] transition-colors duration-300">{cat.name}</h3>
            <span className="text-xs text-[#66635D] group-hover:translate-x-1 group-hover:text-[#5B7FFF] transition-all duration-300 font-bold">Explore →</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const recentItems = useRecentlyViewedStore(state => state.recentItems);
  const [trendingProducts, setTrendingProducts] = useState(
    [...localProducts].sort((a, b) => b.rating - a.rating).slice(0, 4)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await productAPI.getAll("sort=rating&limit=4");
        if (res.success && res.products?.length > 0) {
          setTrendingProducts(res.products);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* Banner Carousel */}
      <HeroBanner />

      {/* Marquee */}
      <Marquee />

      {/* Deal of the Day */}
      <DealOfTheDay />

      {/* Shop by Category (Uniform Equal-Sized Grid Layout) */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 35, rotateX: 20, transformPerspective: 1000 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 select-none"
        >
          <p className="text-xs tracking-[0.4em] uppercase gold mb-3">Browse</p>
          <h2 className="luxe-header-3d text-4xl md:text-5xl font-black tracking-wide pb-1">Shop by Category</h2>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 h-auto">
          {categories.map((cat) => (
            <CategoryCard key={cat.name} cat={cat} />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <FeaturedProducts />

      {/* Trending Now */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/10 dark:border-white/5">
        <div className="flex items-end justify-between mb-10">
          <motion.div
            initial={{ opacity: 0, y: 35, rotateX: 20, transformPerspective: 1000 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="text-xs tracking-[0.4em] uppercase gold mb-3">Popular</p>
            <h2 className="luxe-header-3d text-3xl md:text-4xl font-black tracking-wide pb-1">Trending Now</h2>
          </motion.div>
          <Link to="/shop" className="text-xs tracking-widest uppercase text-[var(--text-secondary)] hover:text-[var(--gold-text)] transition-colors hidden sm:block font-bold hover:scale-105 transition-transform duration-200">View All →</Link>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <svg className="w-8 h-8 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Feature Strip */}
      <FeatureStrip />

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 35, rotateX: 20, transformPerspective: 1000 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-14 select-none"
        >
          <p className="text-xs tracking-[0.4em] uppercase gold mb-3">Testimonials</p>
          <h2 className="luxe-header-3d text-4xl md:text-5xl font-black tracking-wide pb-1">What Our Customers Say</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div 
              key={t.name} 
              className="bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 backdrop-blur-md rounded-3xl p-8 shadow-[0_12px_32px_rgba(30,27,75,0.03)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)] hover:border-[#d4af37]/30 hover:shadow-[0_12px_32px_rgba(30,27,75,0.1)] hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-400 ease-out"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-500/90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[var(--text-secondary)] text-sm italic leading-relaxed mb-6 font-medium">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-white/[0.05] border border-white/20 dark:border-white/5 flex items-center justify-center text-sm font-bold text-[var(--text-primary)]">{t.name.charAt(0)}</div>
                <div>
                  <p className="font-semibold text-sm text-[var(--text-primary)]">{t.name}</p>
                  <p className="text-[var(--text-secondary)] text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Viewed */}
      {recentItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16 border-t border-white/10 dark:border-white/5">
          <h2 className="display text-2xl font-black mb-8 text-[var(--text-primary)]">Recently Viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {recentItems.slice(0, 5).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <Newsletter />
    </div>
  );
}