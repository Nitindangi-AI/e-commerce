import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "../store/useCartStore";
import { useWishlistStore } from "../store/useWishlistStore";
import products from "../data/product";
import { Star, ShoppingBag, Heart, ArrowRight } from "lucide-react";

export default function HeroBanner() {
  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist);

  // Filter 4 high-end products to showcase
  const SHOWCASE_PRODUCTS = [
    products.find((p) => p.id === 1),  // Noir Chronograph
    products.find((p) => p.id === 3),  // Carbon Sunglasses
    products.find((p) => p.id === 4),  // Velvet Sneakers
    products.find((p) => p.id === 12), // Rose Gold Chronograph
  ].filter(Boolean);

  const [activeIdx, setActiveIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const activeProduct = SHOWCASE_PRODUCTS[activeIdx];

  // Auto-advance slides every 8 seconds, unless hovered
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SHOWCASE_PRODUCTS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isHovered, SHOWCASE_PRODUCTS.length]);

  if (!activeProduct) return null;

  const discountPercent = activeProduct.originalPrice
    ? Math.round(((activeProduct.originalPrice - activeProduct.price) / activeProduct.originalPrice) * 100)
    : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(activeProduct);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(activeProduct);
  };

  return (
    <section 
      className="relative min-h-[600px] md:min-h-[750px] bg-[#F5F3EE]/50 border-b border-[#E7E2D8] flex flex-col justify-between pt-24 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Micro-Accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C6A86B]/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#5B7FFF]/3 rounded-full blur-[100px] pointer-events-none z-0" />
      
      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(231,226,216,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(231,226,216,0.15)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 w-full flex-1 flex flex-col md:flex-row items-center gap-12 md:gap-6 relative z-10 py-8">
        
        {/* Left Section: Details */}
        <div className="w-full md:w-1/2 flex flex-col items-start text-left select-none order-2 md:order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeProduct.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-start"
            >
              {/* Product Badge */}
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[10px] tracking-[0.25em] font-extrabold text-[#C6A86B] uppercase">
                  {activeProduct.brand} · {activeProduct.category}
                </span>
                {activeProduct.badge && (
                  <span className="bg-[#5B7FFF]/10 text-[#5B7FFF] text-[9px] tracking-widest font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-[#5B7FFF]/15">
                    {activeProduct.badge}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="display text-4xl sm:text-5xl lg:text-6xl font-black text-[#2B2B28] tracking-tight leading-[1.1] mb-4">
                {activeProduct.name}
              </h1>

              {/* Ratings */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      className={i < Math.floor(activeProduct.rating) ? "fill-[#C6A86B] text-[#C6A86B]" : "text-[#E7E2D8]"} 
                    />
                  ))}
                </div>
                <span className="text-xs text-[#2B2B28] font-bold">{activeProduct.rating}</span>
                <span className="text-xs text-[#66635D] font-medium">({activeProduct.reviews} Verified Reviews)</span>
              </div>

              {/* Specifications capsules */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                {Object.entries(activeProduct.specs || {}).slice(0, 3).map(([key, val]) => (
                  <span 
                    key={key} 
                    className="px-3.5 py-1 bg-white border border-[#E7E2D8] text-[10px] font-extrabold text-[#66635D] rounded-full uppercase tracking-wider shadow-sm"
                  >
                    {key}: {val}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-[#66635D] text-sm md:text-base leading-relaxed font-medium max-w-lg mb-6.5">
                {activeProduct.description}
              </p>

              {/* Pricing section */}
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl font-black text-[#2B2B28] tracking-tight">
                  ₹{activeProduct.price.toLocaleString("en-IN")}
                </span>
                {activeProduct.originalPrice && (
                  <>
                    <span className="text-[#66635D]/60 text-lg line-through font-bold">
                      ₹{activeProduct.originalPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/15 px-3 py-1 text-xs font-black rounded-full tracking-wider">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Action row */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/product/${activeProduct.id}`}
                  className="bg-[#5B7FFF] hover:bg-[#4A6FEE] text-white px-8 py-4 rounded-full text-xs font-extrabold tracking-widest uppercase shadow-[0_4px_16px_rgba(91,127,255,0.22)] hover:shadow-[0_8px_24px_rgba(91,127,255,0.35)] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                >
                  View Details <ArrowRight size={14} />
                </Link>

                <button
                  onClick={handleAddToCart}
                  className={`px-7 py-4 rounded-full text-xs font-extrabold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 shadow-sm border ${
                    added 
                      ? "bg-[#0F766E] border-[#0F766E] text-white" 
                      : "bg-white border-[#E7E2D8] text-[#2B2B28] hover:border-[#5B7FFF] hover:text-[#5B7FFF]"
                  }`}
                >
                  <ShoppingBag size={14} />
                  {added ? "Added!" : "Add to Cart"}
                </button>

                <button
                  onClick={handleToggleWishlist}
                  className="p-4 rounded-full bg-white border border-[#E7E2D8] hover:border-[#DC2626]/40 text-[#66635D] hover:text-[#DC2626] transition-all duration-300 shadow-sm flex items-center justify-center"
                  aria-label="Toggle Wishlist"
                >
                  <Heart 
                    size={15} 
                    className={isInWishlist(activeProduct.id) ? "fill-[#DC2626] text-[#DC2626]" : "transition-transform group-hover:scale-110"} 
                  />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Section: Elegant Floating Image Showcase */}
        <div className="w-full md:w-1/2 flex items-center justify-center relative min-h-[300px] md:min-h-[450px] order-1 md:order-2">
          
          {/* Radial soft backdrop glow */}
          <div className="absolute inset-0 m-auto w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[420px] md:h-[420px] rounded-full bg-gradient-to-tr from-[#E7E2D8]/60 to-[#F5F3EE]/20 border border-[#E7E2D8]/40 shadow-inner z-0" />
          
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeProduct.id}
                initial={{ opacity: 0, scale: 0.88, x: 50, rotate: 3 }}
                animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.92, x: -50, rotate: -3 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] relative drop-shadow-[0_15px_30px_rgba(43,43,40,0.12)] hover:scale-[1.03] transition-transform duration-500 ease-out"
              >
                <img 
                  src={activeProduct.img} 
                  alt={activeProduct.name}
                  className="w-full h-full object-cover rounded-3xl border border-[#E7E2D8]/30 shadow-md bg-white"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Bottom Showcase Selector Row */}
      <div className="w-full bg-white border-t border-[#E7E2D8] py-4.5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-8 w-full flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <p className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-[#66635D] hidden lg:block">
            Showcase Collection
          </p>
          
          {/* Products Horizontal Selection Bar */}
          <div className="flex gap-3 overflow-x-auto w-full lg:w-auto pb-1.5 sm:pb-0 scrollbar-none justify-start sm:justify-center">
            {SHOWCASE_PRODUCTS.map((prod, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={prod.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`flex items-center gap-3 p-2 border rounded-2xl text-left cursor-pointer transition-all duration-300 w-[190px] flex-shrink-0 select-none ${
                    isActive 
                      ? "border-[#C6A86B] bg-[#F5F3EE]/50 shadow-[0_4px_12px_rgba(198,168,107,0.08)] scale-[1.02]" 
                      : "border-[#E7E2D8] hover:border-[#D4CFC3] bg-white hover:bg-[#FAFAF8]"
                  }`}
                >
                  <img 
                    src={prod.img} 
                    alt="" 
                    className="w-9 h-9 rounded-lg object-cover border border-[#E7E2D8]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#2B2B28] font-extrabold truncate uppercase">{prod.name}</p>
                    <p className="text-[10px] text-[#66635D] font-medium tracking-tight">₹{prod.price.toLocaleString("en-IN")}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
