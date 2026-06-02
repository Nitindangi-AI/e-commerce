import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useCartStore } from "../store/useCartStore";
import { useWishlistStore } from "../store/useWishlistStore";
import toast from "react-hot-toast";

export default function ProductCard({ product }) {
  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));

  // Framer Motion values for 3D spatial tilt
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  // Map motion coordinates to degree rotations (max 12 degrees)
  const rX = useTransform(rotateX, [-0.5, 0.5], [12, -12]);
  const rY = useTransform(rotateY, [-0.5, 0.5], [-12, 12]);

  // Smooth springs for buttery physical response
  const springX = useSpring(rX, { stiffness: 180, damping: 20 });
  const springY = useSpring(rY, { stiffness: 180, damping: 20 });

  // Intelligent opposing shadow cast offsets
  const shadowX = useTransform(rotateY, [-0.5, 0.5], [15, -15]);
  const shadowY = useTransform(rotateX, [-0.5, 0.5], [-15, 15]);
  const springShadowX = useSpring(shadowX, { stiffness: 180, damping: 20 });
  const springShadowY = useSpring(shadowY, { stiffness: 180, damping: 20 });

  // Combine springs into a dynamic box shadow string
  const dynamicShadow = useTransform(
    [springShadowX, springShadowY],
    ([x, y]) => `rgba(0, 0, 0, 0.2) ${x}px ${y}px 32px 0px, rgba(212, 175, 55, 0.08) 0px 0px 20px 0px`
  );

  // Motion values for reflective shine position
  const shineX = useMotionValue("-100%");
  const shineY = useMotionValue("-100%");

  const handleMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Normalized mouse position coordinates (from -0.5 to 0.5)
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    rotateX.set(mouseY / height);
    rotateY.set(mouseX / width);

    // Reflective light gradient shine calculations
    const px = ((e.clientX - rect.left) / width) * 100;
    const py = ((e.clientY - rect.top) / height) * 100;
    shineX.set(`${px}%`);
    shineY.set(`${py}%`);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    shineX.set("-100%");
    shineY.set("-100%");
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    toast(isInWishlist ? "Removed from wishlist" : "Added to wishlist ♡", {
      icon: isInWishlist ? "💔" : "❤️",
    });
  };

  const formatPrice = (price) => `₹${price.toLocaleString("en-IN")}`;

  return (
    <Link to={`/product/${product.id}`} className="block group select-none">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: springX,
          rotateY: springY,
          boxShadow: dynamicShadow,
          transformStyle: "preserve-3d",
        }}
        className="relative bg-white border border-[#ECE7DD] rounded-2xl p-4 flex flex-col h-full shadow-[0_4px_16px_rgba(43,43,40,0.03)] hover:shadow-[0_24px_48px_rgba(43,43,40,0.08)] hover:border-[#C6A86B]/50 hover:-translate-y-1.5 hover:scale-[1.01] hover:bg-[#F8F6F2] transition-all duration-400 ease-out group"
      >
        {/* Dynamic Reflective Light Gloss Overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl z-20 mix-blend-overlay opacity-30 group-hover:opacity-50 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 120px at var(--shine-x) var(--shine-y), rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 80%)`,
            // Set custom properties via style motion binding
            "--shine-x": shineX,
            "--shine-y": shineY,
          }}
        />

        {/* 3D Image Wrapper Panel */}
        <div 
          className="relative w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center bg-[#F8F6F2] border border-[#ECE7DD] mb-4 group-hover:border-[#C6A86B]/20 transition-colors duration-300"
          style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
        >
          <img
            src={product.img}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover opacity-100 group-hover:scale-108 transition-all duration-700 ease-out"
          />

          {/* Badge Tag */}
          {product.badge && (
            <span 
              className="absolute top-3 left-3 text-[9px] tracking-widest uppercase px-3 py-1 rounded-full font-extrabold z-10 bg-[#5B7FFF]/10 text-[#5B7FFF] border border-[#5B7FFF]/15 shadow-sm"
              style={{ transform: "translateZ(20px)" }}
            >
              {product.badge}
            </span>
          )}

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 z-30 ${
              isInWishlist
                ? "border-red-500/30 text-red-500 bg-red-50/80 hover:scale-105"
                : "border-[#ECE7DD] text-[#66635D] hover:text-[#DC2626] bg-white hover:bg-[#F8F6F2] hover:scale-110 shadow-sm"
            }`}
            style={{ transform: "translateZ(20px)" }}
            aria-label="Toggle wishlist"
          >
            <svg className="w-4 h-4" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Card Hover Light Overlay */}
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Premium Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#5B7FFF] hover:bg-[#4A6FEE] text-white px-6 py-2.5 rounded-full text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-400 ease-out whitespace-nowrap z-30 shadow-md hover:scale-105 active:scale-95 font-extrabold"
            style={{ transform: "translateZ(40px)" }}
          >
            Add to Cart
          </button>
        </div>

        {/* Text Details Panel with 3D Z-Depth Translation */}
        <div 
          className="px-1 flex-1 flex flex-col"
          style={{ transform: "translateZ(20px)" }}
        >
          <p className="text-[#66635D] text-[10px] tracking-widest uppercase mb-1 font-extrabold">
            {product.category}
          </p>
          <h3 className="font-extrabold text-[#2B2B28] text-sm md:text-base mb-1.5 group-hover:text-[#5B7FFF] transition-colors duration-300 line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mt-auto">
            <p className="text-[#C6A86B] font-extrabold text-base md:text-lg">{formatPrice(product.price)}</p>
            {product.originalPrice && (
              <p className="text-[#66635D]/50 text-xs md:text-sm line-through font-bold">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {product.originalPrice && (
            <p className="text-emerald-600 text-[10px] font-extrabold mt-0.5">Save {formatPrice(product.originalPrice - product.price)}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}