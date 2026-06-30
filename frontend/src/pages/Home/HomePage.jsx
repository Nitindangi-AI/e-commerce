import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getProductImageUrl } from "../../utils/image";
import { Helmet } from "react-helmet-async";
import HeroBanner from "../../components/HeroBanner";
import Marquee from "../../components/Marquee";
import FeatureStrip from "../../components/FeatureStrip";
import Newsletter from "../../components/Newsletter";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/SkeletonCard";
import { useRecentlyViewedStore } from "../../store/useRecentlyViewedStore";
import { productAPI } from "../../services/api";
import localProducts from "../../data/product";
import { toast } from "../../components/GlobalToast";
import { formatPrice } from "../../utils/price";

const categoryImages = {
  Watches: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=600&auto=format&fit=crop",
  Shirts: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop",
  Footwear: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop",
  Grooming: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop",
  Accessories: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop",
  Apparel: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop",
  Men: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop",
  Women: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop",
};

const defaultCategories = [
  { name: "Men", img: categoryImages.Men },
  { name: "Women", img: categoryImages.Women },
  { name: "Accessories", img: categoryImages.Accessories },
  { name: "Watches", img: categoryImages.Watches },
  { name: "Footwear", img: categoryImages.Footwear },
];

const testimonials = [
  { name: "Arjun Mehta", role: "Entrepreneur", text: "Trendz has completely changed how I shop for premium accessories. The quality is unmatched.", rating: 5 },
  { name: "Priya Sharma", role: "Fashion Designer", text: "I recommend Trendz to all my clients. The curation is impeccable — every piece tells a story.", rating: 5 },
  { name: "Rahul Verma", role: "Tech Lead", text: "Finally, an Indian brand that delivers true luxury. The Noir Chronograph is my daily companion.", rating: 5 },
];

export default function HomePage() {
  const recentItems = useRecentlyViewedStore(state => state.recentItems);
  const [categoriesList, setCategoriesList] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [dealProduct, setDealProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 24, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const difference = endOfDay - now;
      
      let tempTimeLeft = {};
      if (difference > 0) {
        tempTimeLeft = {
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      } else {
        tempTimeLeft = { hours: 23, minutes: 59, seconds: 59 };
      }
      setTimeLeft(tempTimeLeft);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        // 1. Fetch categories
        const catRes = await productAPI.getCategories();
        if (catRes.success && catRes.categories?.length > 0) {
          const list = catRes.categories.map(name => ({
            name,
            img: categoryImages[name] || categoryImages.Apparel
          }));
          setCategoriesList(list);
        } else {
          setCategoriesList(defaultCategories);
        }

        // 2. Fetch trending (top selling)
        const trendRes = await productAPI.getTopSelling(8);
        if (trendRes.success && trendRes.products?.length > 0) {
          setTrendingProducts(trendRes.products);
        } else {
          setTrendingProducts(localProducts.slice(0, 8));
        }

        // 3. Fetch new arrivals
        const newRes = await productAPI.getAll("sort=newest&limit=8");
        if (newRes.success && newRes.products?.length > 0) {
          setNewArrivals(newRes.products);
        } else {
          setNewArrivals(localProducts.slice(0, 8));
        }

        // 4. Fetch featured product for Deal of the Day
        const featRes = await productAPI.getFeatured(1);
        if (featRes.success && featRes.products?.length > 0) {
          setDealProduct(featRes.products[0]);
        } else {
          setDealProduct(localProducts[0]);
        }

      } catch (err) {
        console.error("Failed to load home page data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  const doubleCategories = [...categoriesList, ...categoriesList];

  return (
    <div className="overflow-x-hidden">
      <Helmet>
        <title>Trendy — Premium Fashion</title>
        <meta name="description" content="Discover premium fashion, accessories, watches, footwear & more on Trendy. Shop the latest trends at unbeatable prices." />
        <meta property="og:title" content="Trendy — Premium Fashion" />
        <meta property="og:description" content="Discover premium fashion, accessories, watches, footwear & more on Trendy." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Trendy — Premium Fashion" />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1200&auto=format&fit=crop" />
      </Helmet>

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

      {/* Deal of the Day Countdown section */}
      {dealProduct && (
        <section className="max-w-7xl mx-auto px-6 py-20 bg-gradient-to-br from-[#FAFAF8] to-[#F5F3EE] dark:from-[#111111] dark:to-[#0A0A0A] border-y border-[#E8E8E8] dark:border-white/5 rounded-3xl my-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#C9A84C]/5 blur-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-6">
              <span className="inline-block px-3 py-1 bg-[#C9A84C]/10 text-[#C9A84C] text-[10px] font-bold tracking-[0.2em] uppercase rounded-full">
                ⏳ Deal of the Day
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-[#111111] dark:text-white leading-tight">
                Premium Design. <br />Limited Offer.
              </h2>
              <p className="text-[#6B6B6B] dark:text-gray-400 text-sm leading-relaxed max-w-md">
                Experience luxury with our featured masterpiece {dealProduct.name}. Exclusive pricing ends soon.
              </p>
              
              {/* Countdown timer */}
              <div className="flex gap-4 select-none">
                {[
                  { label: "Hours", val: String(timeLeft.hours).padStart(2, "0") },
                  { label: "Mins", val: String(timeLeft.minutes).padStart(2, "0") },
                  { label: "Secs", val: String(timeLeft.seconds).padStart(2, "0") },
                ].map((t) => (
                  <div key={t.label} className="flex flex-col items-center p-3 bg-white dark:bg-[#1A1A18] border border-[#E8E8E8] dark:border-white/5 rounded-xl min-w-[70px] shadow-sm">
                    <span className="text-2xl font-bold text-[#111111] dark:text-white font-mono">{t.val}</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#6B6B6B] dark:text-gray-400 mt-1">{t.label}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-6">
                <div>
                  {dealProduct.originalPrice && dealProduct.originalPrice > dealProduct.price && (
                    <span className="text-xs text-[#6B6B6B] dark:text-gray-400 line-through">{formatPrice(dealProduct.originalPrice)}</span>
                  )}
                  <p className="text-2xl font-bold text-[#C9A84C]">{formatPrice(dealProduct.price)}</p>
                </div>
                <Link
                  to={`/product/slug/${dealProduct.slug || dealProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                  className="btn-gold px-8 py-3.5 text-xs font-bold uppercase tracking-wider shadow-md hover:scale-105 transition-all"
                >
                  Claim Offer Now
                </Link>
              </div>
            </div>

            <div className="flex justify-center relative">
              <div className="w-80 h-80 rounded-2xl overflow-hidden border border-[#E8E8E8] dark:border-white/5 shadow-luxury">
                <img
                  src={getProductImageUrl(dealProduct.img, 'thumbnail')}
                  srcSet={`${getProductImageUrl(dealProduct.img, 'thumbnail')} 400w, ${getProductImageUrl(dealProduct.img, 'detail')} 800w`}
                  sizes="(max-width: 600px) 400px, 800px"
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={400}
                  alt={dealProduct.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </section>
      )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {trendingProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* New Arrivals */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#E8E8E8] dark:border-white/5">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Fresh</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#111111] dark:text-white">New Arrivals</h2>
          </div>
          <Link to="/shop?sort=newest" className="text-[10px] tracking-[0.2em] uppercase text-[#6B6B6B] hover:text-[#C9A84C] transition-colors hidden sm:block font-bold">
            View All →
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Feature Strip */}
      <FeatureStrip />

      {/* Top Brands Marquee */}
      <section className="py-16 bg-white dark:bg-[#0A0A0A] border-y border-[#E8E8E8] dark:border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-2">Heritage</p>
          <h2 className="font-display text-2xl font-bold text-[#111111] dark:text-white">Curated Premium Brands</h2>
        </div>
        <div className="w-full overflow-hidden py-4 bg-gradient-to-r from-transparent via-[#FAFAF8] to-transparent dark:via-white/[0.02]">
          <div className="flex gap-12 justify-around items-center max-w-5xl mx-auto flex-wrap px-6">
            {[
              { name: "Meridian", logo: "👑" },
              { name: "Trendz Luxury", logo: "💎" },
              { name: "Vogue Elite", logo: "✨" },
              { name: "Obsidian", logo: "♠️" },
              { name: "Aura India", logo: "🏵️" },
            ].map((b) => (
              <div key={b.name} className="flex items-center gap-2 hover:scale-105 transition-all select-none">
                <span className="text-xl">{b.logo}</span>
                <span className="font-display text-xs tracking-[0.35em] uppercase font-bold text-[#6B6B6B] dark:text-gray-300">
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

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