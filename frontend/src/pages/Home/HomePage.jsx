import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import HeroBanner from "../../components/HeroBanner";
import Marquee from "../../components/Marquee";
import FeaturedProducts from "../../components/FeaturedProducts";
import FeatureStrip from "../../components/FeatureStrip";
import Newsletter from "../../components/Newsletter";
import DealOfTheDay from "../../components/DealOfTheDay";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/SkeletonCard";
import { useRecentlyViewedStore } from "../../store/useRecentlyViewedStore";
import { productAPI } from "../../services/api";
import localProducts from "../../data/product";

const categories = [
  { name: "Men", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop" },
  { name: "Women", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop" },
  { name: "Accessories", img: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop" },
  { name: "Watches", img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=600&auto=format&fit=crop" },
  { name: "Footwear", img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop" },
  { name: "Eyewear", img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop" },
];

const testimonials = [
  { name: "Arjun Mehta", role: "Entrepreneur", text: "Trendz has completely changed how I shop for premium accessories. The quality is unmatched.", rating: 5 },
  { name: "Priya Sharma", role: "Fashion Designer", text: "I recommend Trendz to all my clients. The curation is impeccable — every piece tells a story.", rating: 5 },
  { name: "Rahul Verma", role: "Tech Lead", text: "Finally, an Indian brand that delivers true luxury. The Noir Chronograph is my daily companion.", rating: 5 },
];

const doubleCategories = [...categories, ...categories];

export default function HomePage() {
  const recentItems = useRecentlyViewedStore(state => state.recentItems);
  const [trendingProducts, setTrendingProducts] = useState(
    [...localProducts].sort((a, b) => b.rating - a.rating).slice(0, 4)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await productAPI.getAll("sort=rating&limit=4");
        if (res.success && res.products?.length > 0) {
          setTrendingProducts(res.products);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    // Simulate brief loading for skeleton demo
    const timer = setTimeout(() => fetchTrending(), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* Hero Banner */}
      <HeroBanner />

      {/* Category Strip — Apple-style horizontal scroll */}
      <section className="py-14 bg-white dark:bg-[#0A0A0A] border-b border-[#E8E8E8] dark:border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Browse</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#111111] dark:text-white">Shop by Category</h2>
        </div>
        <div className="w-full overflow-hidden py-2">
          <div className="flex gap-6 px-6 md:px-12 w-max category-scroll-strip">
            {doubleCategories.map((cat, idx) => (
              <Link
                key={`${cat.name}-${idx}`}
                to={`/shop?category=${cat.name}`}
                className="flex-shrink-0 w-60 h-72 rounded-2xl overflow-hidden border border-[#E8E8E8] dark:border-white/5 shadow-card hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="relative w-full h-full">
                  <img
                    src={cat.img}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white font-display text-lg font-bold tracking-wide">{cat.name}</h3>
                    <p className="text-white/60 text-[10px] tracking-widest uppercase mt-1 group-hover:text-[#C9A84C] transition-colors">Explore →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee */}
      <Marquee />

      {/* Deal of the Day */}
      <DealOfTheDay />

      {/* Featured Products */}
      <FeaturedProducts />

      {/* Trending Now */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Popular</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#111111] dark:text-white">Trending Now</h2>
          </div>
          <Link to="/shop" className="text-[10px] tracking-[0.2em] uppercase text-[#6B6B6B] hover:text-[#C9A84C] transition-colors hidden sm:block font-bold">
            View All →
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Feature Strip */}
      <FeatureStrip />

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Testimonials</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#111111] dark:text-white">What Our Customers Say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-8 shadow-card hover:shadow-luxury hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-[#C9A84C]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#6B6B6B] dark:text-gray-400 text-sm italic leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-sm font-bold text-[#C9A84C]">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#111111] dark:text-white">{t.name}</p>
                  <p className="text-[#6B6B6B] dark:text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Viewed */}
      {recentItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16 border-t border-[#E8E8E8] dark:border-white/5">
          <h2 className="font-display text-2xl font-bold mb-8 text-[#111111] dark:text-white">Recently Viewed</h2>
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