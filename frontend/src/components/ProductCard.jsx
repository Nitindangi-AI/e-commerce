import { useState } from "react";
import { Link } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useWishlistStore } from "../store/useWishlistStore";
import toast from "react-hot-toast";

export default function ProductCard({ product }) {
  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));

  const [added, setAdded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    toast.success(`${product.name} added to cart!`);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    setIsToggling(true);
    setTimeout(() => setIsToggling(false), 400);
    toast(isInWishlist ? "Removed from wishlist" : "Added to wishlist ♡", {
      icon: isInWishlist ? "💔" : "❤️",
    });
  };

  const formatPrice = (price) => `₹${price.toLocaleString("en-IN")}`;

  const badgeColor = () => {
    const b = product.badge?.toLowerCase();
    if (b === "sale") return "bg-red-500 text-white";
    if (b === "hot") return "bg-orange-500 text-white";
    if (b === "limited") return "bg-[#111111] text-white";
    return "bg-[#C9A84C] text-white"; 
  };

  return (
    <Link to={`/product/${product.id}`} className="block group select-none">
      
      {/* Local styles for checkmark & heartbeat animations */}
      <style>{`
        @keyframes heartBeat {
          0% { transform: scale(1); }
          30% { transform: scale(1.4); }
          60% { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
        .animate-heart-beat {
          animation: heartBeat 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      <div className="relative bg-white dark:bg-[#111111] rounded-2xl overflow-hidden border border-[#E8E8E8] dark:border-white/5 shadow-card hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col h-full">
        {/* Image Container — 1:1 */}
        <div className="relative w-full aspect-square overflow-hidden bg-[#FAFAF8] dark:bg-white/[0.02]">
          <img
            src={product.img}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {/* Badge (top-left) */}
          {product.badge && (
            <span className={`absolute top-3 left-3 text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full font-bold z-10 ${badgeColor()}`}>
              {product.badge}
            </span>
          )}

          {/* Wishlist Heart (top-right, appears on hover) */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-20 ${
              isInWishlist
                ? "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-500 scale-100"
                : "bg-white/90 dark:bg-black/50 border border-[#E8E8E8] dark:border-white/10 text-[#6B6B6B] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:text-red-500 hover:border-red-200"
            } ${isToggling ? "animate-heart-beat" : ""}`}
            aria-label="Toggle wishlist"
          >
            <svg className="w-4 h-4 transition-all duration-300" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Quick Add — slides up from bottom on hover */}
          <button
            onClick={handleAddToCart}
            disabled={added}
            className={`absolute bottom-0 left-0 right-0 py-3 text-[10px] tracking-[0.2em] uppercase font-bold translate-y-full group-hover:translate-y-0 transition-all duration-300 ease-out z-20 text-center border-0 ${
              added 
                ? "bg-green-600 text-white" 
                : "bg-[#C9A84C] hover:bg-[#B5963F] text-white"
            }`}
          >
            {added ? "✓ Added" : "Quick Add"}
          </button>
        </div>

        {/* Card Details */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Brand */}
          <p className="text-[#6B6B6B] dark:text-gray-400 text-[9px] tracking-[0.2em] uppercase font-semibold mb-1">
            {product.brand}
          </p>

          {/* Name */}
          <h3 className="font-semibold text-[#111111] dark:text-white text-sm leading-snug mb-2 line-clamp-1 group-hover:text-[#C9A84C] transition-colors duration-300">
            {product.name}
          </h3>

          {/* Star Rating */}
          <div className="flex items-center gap-1 mb-2.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`w-3 h-3 ${s <= Math.round(product.rating) ? "text-[#C9A84C]" : "text-[#E8E8E8] dark:text-white/10"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-[10px] text-[#6B6B6B] dark:text-gray-400 font-medium ml-0.5">
              ({product.reviews || 0})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-[#111111] dark:text-white font-bold text-base">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[#6B6B6B]/50 dark:text-gray-500 text-xs line-through font-medium">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}