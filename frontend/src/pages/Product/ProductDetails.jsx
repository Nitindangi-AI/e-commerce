import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { productAPI, reviewAPI } from "../../services/api";
import ProductCard from "../../components/ProductCard";
import SkeletonProductDetail from "../../components/SkeletonProductDetail";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useRecentlyViewedStore } from "../../store/useRecentlyViewedStore";
import { insforge } from "../../lib/insforge";
import toast from "react-hot-toast";

const COLOR_HEX_MAP = {
  black: "#111111",
  "matte black": "#282828",
  brown: "#8B5A2B",
  navy: "#1D2D44",
  silver: "#D3D3D3",
  "rose gold": "#E0A99E",
  tortoise: "#5C4033",
  gold: "#C9A84C",
  gunmetal: "#4E5D6C",
  white: "#FFFFFF",
  grey: "#808080",
  tan: "#D2B48C",
  burgundy: "#800020",
  oxblood: "#4A0E17",
  blue: "#4169E1",
  pink: "#FFC0CB",
  beige: "#F5F5DC",
  olive: "#556B2F",
  ivory: "#FFFFF0",
  khaki: "#F0E68C",
  charcoal: "#36454F",
  indigo: "#4B0082",
  "light wash": "#ADD8E6",
  green: "#2E8B57",
  red: "#D9383A",
};

const ratingLabels = {
  1: "Poor",
  2: "Fair",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

// Simple Star Rating utility
function StarRating({ rating, size = "w-4 h-4" }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${size} ${s <= Math.round(rating) ? "text-[#C9A84C] fill-current" : "text-border fill-none stroke-current"}`}
          viewBox="0 0 20 20"
          strokeWidth={1.5}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [vendorInfo, setVendorInfo] = useState(null);

  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => (product ? state.isInWishlist(product.id) : false));
  const addToRecentlyViewed = useRecentlyViewedStore((state) => state.addToRecentlyViewed);

  // Selector states
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [pincode, setPincode] = useState("");
  const [pincodeResult, setPincodeResult] = useState(null);
  const [openAccordion, setOpenAccordion] = useState("description");

  // Magnifier zoom states
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  // Review Form & Modal States
  const [currentUser, setCurrentUser] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [mockPhotos, setMockPhotos] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const fileInputRef = useRef(null);

  // Modal active image preview
  const [previewImage, setPreviewImage] = useState(null);

  const reviewsSectionRef = useRef(null);

  const fetchProductData = async () => {
    try {
      const prodRes = await productAPI.getById(id);
      if (prodRes.success) {
        setProduct(prodRes.product);

        // Load vendor/seller info
        if (prodRes.product.seller) {
          try {
            const { data: vData } = await insforge.database
              .from("vendors")
              .select("store_name, store_logo, status, user_id")
              .eq("user_id", prodRes.product.seller)
              .eq("status", "approved")
              .maybeSingle();
            setVendorInfo(vData || null);
          } catch (vErr) {
            console.error("Failed to load vendor info:", vErr);
          }
        }

        // Load reviews
        const revRes = await reviewAPI.getForProduct(prodRes.product.id);
        if (revRes.success) setReviews(revRes.reviews || []);

        // Load related products
        const relRes = await productAPI.getRelated(prodRes.product.id);
        if (relRes.success) {
          setRelatedProducts(relRes.products || []);
        }
      }
    } catch (err) {
      console.error("Failed to load product data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProductData();
  }, [id]);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await insforge.auth.getUser();
      setCurrentUser(data?.user || null);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product);
      setSelectedImage(0);
      setSelectedColor(0);
      setSelectedSize(product.sizes?.length ? 0 : null);
      setQty(1);
      setPincodeResult(null);
    }
  }, [product]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await reviewAPI.create(product.id, {
        rating: reviewRating,
        title: reviewTitle,
        text: reviewText,
      });

      // Save mock photos to localStorage to keep them persistent for the session
      if (mockPhotos.length > 0) {
        const localPhotoKey = `review_photos_${product.id}`;
        const existingLocal = JSON.parse(localStorage.getItem(localPhotoKey) || "{}");
        existingLocal[reviewTitle] = mockPhotos;
        localStorage.setItem(localPhotoKey, JSON.stringify(existingLocal));
      }

      toast.success("Review submitted successfully!");
      setReviewTitle("");
      setReviewText("");
      setMockPhotos([]);
      setIsReviewModalOpen(false);
      await fetchProductData();
    } catch (err) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await reviewAPI.markHelpful(reviewId);
      toast.success("Marked as helpful!");
      const revRes = await reviewAPI.getForProduct(product.id);
      if (revRes.success) setReviews(revRes.reviews || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = () => {
    if (product.sizes?.length && selectedSize === null) {
      toast.error("Please select a size");
      return;
    }
    const colorVal = product.colors?.[selectedColor] || "";
    const sizeVal = product.sizes?.[selectedSize] || "";

    // Sync quantity logic with Zustand store
    const cartItems = useCartStore.getState().cartItems;
    const existingItem = cartItems.find(
      (item) =>
        (item.id || item._id) === product.id &&
        (item.selectedColor || "") === colorVal &&
        (item.selectedSize || "") === sizeVal
    );

    if (existingItem) {
      useCartStore.getState().updateQuantity(product.id, existingItem.quantity + qty, colorVal, sizeVal);
    } else {
      addToCart(product, colorVal, sizeVal);
      if (qty > 1) {
        useCartStore.getState().updateQuantity(product.id, qty, colorVal, sizeVal);
      }
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    toast.success(`${product.name} (${qty} items) added to cart!`);
  };

  const checkPincode = () => {
    if (pincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setPincodeResult({ available: true, days: product.deliveryDays || 3, cod: true });
  };

  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [bgPos, setBgPos] = useState("0% 0%");

  const handleMagnifierMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    // Constrain lens coordinates to stay inside the image boundary
    const constrainedX = Math.max(0, Math.min(x, width));
    const constrainedY = Math.max(0, Math.min(y, height));

    const bgX = (constrainedX / width) * 100;
    const bgY = (constrainedY / height) * 100;

    setLensPos({ x: constrainedX, y: constrainedY });
    setBgPos(`${bgX}% ${bgY}%`);
  };

  const toggleAccordion = (tab) => {
    setOpenAccordion(openAccordion === tab ? null : tab);
  };

  const scrollToReviews = (e) => {
    e.preventDefault();
    reviewsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map((file) => URL.createObjectURL(file));
    setMockPhotos((prev) => [...prev, ...urls]);
  };

  const handleRemovePhoto = (idx) => {
    setMockPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return <SkeletonProductDetail />;
  }

  if (!product) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center pt-24 px-4 bg-background">
        <h2 className="display text-4xl font-black text-primary mb-4">Product Not Found</h2>
        <p className="text-secondary mb-8 text-center max-w-md">The luxury item you are searching for is currently unavailable or doesn't exist.</p>
        <Link to="/shop" className="btn-gold px-8 py-3 rounded-full text-xs tracking-widest uppercase">Back to Shop</Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [product.img];
  const formatPrice = (price) => `₹${price.toLocaleString("en-IN")}`;
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  const deliveryDays = product.deliveryDays || 3;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
  const deliveryDateStr = deliveryDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const isSizeOutOfStock = (size, idx) => {
    if (product.stock === 0) return true;
    if (product.stock < 5 && idx === product.sizes.length - 1) return true;
    return false;
  };

  // Get locally stored mock review photos
  const getReviewPhotos = (title) => {
    const localPhotoKey = `review_photos_${product.id}`;
    const localData = JSON.parse(localStorage.getItem(localPhotoKey) || "{}");
    return localData[title] || [];
  };

  const returnable = product.returnPolicy?.returnable ?? true;
  const returnDays = product.returnPolicy?.returnDays ?? 30;

  return (
    <div className="bg-[#FAFAF8] dark:bg-[#0A0A0A] min-h-screen pt-20">
      {/* Local styles for checkmark & heartbeat & image transitions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
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

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2 text-[10px] text-[#6B6B6B] dark:text-gray-400 tracking-widest uppercase flex-wrap font-semibold">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <span>/</span>
          <Link to={`/shop?category=${product.category}`} className="hover:text-primary transition-colors">{product.category}</Link>
          <span>/</span>
          <span className="text-[#111111] dark:text-white font-bold truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start bg-white dark:bg-[#111111]/30 border border-[#E8E8E8] dark:border-white/5 p-6 md:p-8 rounded-3xl shadow-card">
          
          {/* Gallery - Left Column */}
          <div className="flex flex-col gap-6">
            {/* Large Main Image with Zoom Magnifier Lens */}
            <div 
              className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FAFAF8] dark:bg-white/[0.02] border border-[#E8E8E8] dark:border-white/5 cursor-crosshair group"
              onMouseMove={handleMagnifierMove}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
            >
              <img 
                key={selectedImage}
                src={images[selectedImage]} 
                alt={product.name} 
                className="w-full h-full object-cover animate-fade-in"
              />
              
              {/* Magnifying Glass Lens overlay */}
              {isZoomed && (
                <div 
                  className="pointer-events-none absolute w-36 h-36 border-2 border-[#C9A84C] rounded-full shadow-[0_0_15px_rgba(0,0,0,0.25)] bg-no-repeat bg-white dark:bg-[#111111] z-30"
                  style={{
                    left: `${lensPos.x - 72}px`,
                    top: `${lensPos.y - 72}px`,
                    backgroundImage: `url(${images[selectedImage]})`,
                    backgroundPosition: bgPos,
                    backgroundSize: `250%`, // 2.5x zoom
                  }}
                />
              )}

              {/* Product Badge */}
              {product.badge && (
                <span className={`absolute top-4 left-4 text-[9px] tracking-widest uppercase px-3 py-1 rounded-full font-bold z-20 text-white ${
                  product.badge.toLowerCase() === 'sale' || product.badge.toLowerCase() === 'hot' ? 'bg-red-600' : 'bg-[#C9A84C]'
                }`}>
                  {product.badge}
                </span>
              )}

              {/* Low Stock Warning */}
              {product.stock > 0 && product.stock <= 5 && (
                <div className="absolute bottom-4 left-4 bg-red-600/95 backdrop-blur-sm text-white text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-full z-20 shadow-md animate-pulse">
                  Only {product.stock} units left!
                </div>
              )}

              {product.stock === 0 && (
                <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex items-center justify-center backdrop-blur-[2px] z-20">
                  <span className="bg-[#0A0A0A] text-white text-xs tracking-[0.2em] uppercase font-bold px-6 py-3 rounded-full shadow-lg">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip - Below Image */}
            <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none justify-start">
              {images.map((img, i) => (
                <button 
                  key={img + i} 
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border transition-all duration-300 flex-shrink-0 ${
                    i === selectedImage 
                      ? "border-[#C9A84C] ring-2 ring-[#C9A84C]/10 scale-95" 
                      : "border-[#E8E8E8] dark:border-white/5 hover:border-[#C9A84C]/50"
                  }`}
                >
                  <img src={img} alt={`${product.name} thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details - Right Column */}
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Brand name */}
              <span className="text-[#6B6B6B] dark:text-gray-400 text-[10px] tracking-[0.25em] uppercase font-bold mb-2.5 block">
                {product.brand}
              </span>

              {/* Product Title */}
              <h1 className="font-display text-3xl md:text-4xl font-bold text-[#111111] dark:text-white mb-3 leading-tight">
                {product.name}
              </h1>

              {/* Ratings Summary Link */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="flex items-center gap-1.5">
                  <StarRating rating={product.rating} size="w-3.5 h-3.5" />
                  <span className="text-xs font-bold text-[#111111] dark:text-white ml-1">{product.rating}</span>
                </div>
                <a 
                  href="#reviews-section" 
                  onClick={scrollToReviews}
                  className="text-[#6B6B6B] dark:text-gray-400 hover:text-[#C9A84C] text-xs font-semibold hover:underline transition-colors"
                >
                  ({reviews.length} reviews)
                </a>
              </div>

              {/* Price Panel */}
              <div className="border-y border-[#E8E8E8] dark:border-white/5 py-4 mb-6">
                <div className="flex items-baseline gap-4">
                  <span className="text-[#111111] dark:text-white font-bold text-2xl tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <>
                      <span className="text-[#6B6B6B]/50 dark:text-gray-500 text-base line-through font-medium">
                        {formatPrice(product.originalPrice)}
                      </span>
                      <span className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        SAVE {discount}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Partner Store Link (if verified vendor) */}
              {vendorInfo && (
                <Link to={`/store/${vendorInfo.user_id}`}
                  className="flex items-center gap-3 mb-6 p-4 bg-[#FAFAF8] dark:bg-[#111111]/40 border border-[#E8E8E8] dark:border-white/5 rounded-2xl hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {vendorInfo.store_logo ? (
                      <img src={vendorInfo.store_logo} alt={vendorInfo.store_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#C9A84C] font-bold text-sm">{vendorInfo.store_name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#111111] dark:text-white truncate">{vendorInfo.store_name}</span>
                      <span className="text-[8px] bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest">Verified Partner</span>
                    </div>
                    <p className="text-[10px] text-[#6B6B6B] dark:text-gray-400 tracking-wider mt-0.5">Explore full collection storefront →</p>
                  </div>
                  <svg className="w-4 h-4 text-[#6B6B6B]/40 group-hover:text-[#C9A84C] group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}

              {/* Color Swatch Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6">
                  <span className="text-[10px] tracking-widest uppercase text-[#6B6B6B] dark:text-gray-400 block font-bold mb-2.5">
                    Color: <span className="text-[#111111] dark:text-white font-bold">{product.colors[selectedColor]}</span>
                  </span>
                  <div className="flex gap-3">
                    {product.colors.map((c, i) => {
                      const hex = COLOR_HEX_MAP[c.toLowerCase()] || "#CCCCCC";
                      const isSelected = i === selectedColor;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(i)}
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                            isSelected ? "border-[#C9A84C] ring-2 ring-[#C9A84C]/20" : "border-[#E8E8E8] dark:border-white/10 hover:border-[#6B6B6B]"
                          }`}
                          title={c}
                        >
                          <span
                            className="w-5 h-5 rounded-full block border border-black/5"
                            style={{ backgroundColor: hex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-8">
                  <span className="text-[10px] tracking-widest uppercase text-[#6B6B6B] dark:text-gray-400 block font-bold mb-2.5">
                    Size
                  </span>
                  <div className="flex gap-2.5 flex-wrap">
                    {product.sizes.map((s, i) => {
                      const isOutOfStock = isSizeOutOfStock(s, i);
                      const isSelected = i === selectedSize;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => setSelectedSize(i)}
                          className={`relative w-14 h-10 rounded-lg text-xs font-bold border flex items-center justify-center transition-all duration-300 ${
                            isOutOfStock
                              ? "border-[#E8E8E8] dark:border-white/5 text-[#6B6B6B]/30 bg-[#FAFAF8]/50 dark:bg-transparent cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-[#C9A84C] text-white border-[#C9A84C] shadow-sm"
                              : "border-[#E8E8E8] dark:border-white/10 text-[#111111] dark:text-white hover:border-[#C9A84C] bg-white dark:bg-[#111111]"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity + Add to Cart + Wishlist */}
              <div className="mb-6">
                <span className="text-[10px] tracking-widest uppercase text-[#6B6B6B] dark:text-gray-400 block font-bold mb-2.5">
                  Quantity
                </span>
                <div className="flex items-center border border-[#E8E8E8] dark:border-white/10 rounded-xl bg-white dark:bg-[#111111] overflow-hidden w-32 h-12 mb-6">
                  <button 
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={product.stock === 0}
                    className="px-4 h-full text-[#6B6B6B] hover:text-[#111111] dark:hover:text-white disabled:opacity-50 text-lg transition-colors font-semibold"
                  >
                    −
                  </button>
                  <span className="flex-1 text-sm font-bold text-center text-[#111111] dark:text-white">{qty}</span>
                  <button 
                    onClick={() => setQty((q) => q + 1)}
                    disabled={product.stock === 0}
                    className="px-4 h-full text-[#6B6B6B] hover:text-[#111111] dark:hover:text-white disabled:opacity-50 text-lg transition-colors font-semibold"
                  >
                    +
                  </button>
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={handleAddToCart}
                    disabled={product.stock === 0 || added}
                    className={`w-full py-4 rounded-xl text-xs tracking-[0.2em] uppercase font-bold transition-all duration-300 disabled:opacity-50 border-0 ${
                      added 
                        ? "bg-green-600 text-white" 
                        : "bg-[#0A0A0A] hover:bg-[#222222] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black"
                    }`}
                  >
                    {added ? "✓ Added" : "Add to Cart"}
                  </button>
                  <button 
                    onClick={() => {
                      toggleWishlist(product);
                      setIsTogglingWishlist(true);
                      setTimeout(() => setIsTogglingWishlist(false), 400);
                      toast(isInWishlist ? "Removed from wishlist" : "Added to wishlist ♡", {
                        icon: isInWishlist ? "💔" : "❤️",
                      });
                    }}
                    className="w-full border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/5 py-4 rounded-xl text-xs tracking-[0.2em] uppercase font-bold transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <svg 
                      className={`w-4 h-4 transition-all duration-300 ${isTogglingWishlist ? "animate-heart-beat" : ""}`} 
                      fill={isInWishlist ? "currentColor" : "none"} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {isInWishlist ? "Saved in Wishlist" : "Add to Wishlist"}
                  </button>
                </div>
              </div>

              {/* Delivery and Return Policy */}
              <div className="border border-[#E8E8E8] dark:border-white/5 rounded-2xl p-5 bg-[#FAFAF8] dark:bg-[#111111]/40 mb-8 space-y-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-[#111111] dark:text-white font-semibold">
                    Free delivery in {deliveryDays} days
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                  <span className="text-xs text-[#111111] dark:text-white font-semibold">
                    Return Policy: {returnable ? `Returnable within ${returnDays} days` : "Non-returnable / Final Sale"}
                  </span>
                </div>
              </div>

            </div>

            {/* Expandable Accordion */}
            <div className="border-t border-[#E8E8E8] dark:border-white/5 pt-4 space-y-2">
              {/* Description Accordion */}
              <div className="border-b border-[#E8E8E8] dark:border-white/5">
                <button
                  onClick={() => toggleAccordion("description")}
                  className="w-full flex justify-between items-center py-4 text-left uppercase tracking-widest text-[10px] font-bold text-[#111111] dark:text-white hover:text-[#C9A84C] transition-colors"
                >
                  <span>Description</span>
                  <span className="text-sm font-light">
                    {openAccordion === "description" ? "−" : "+"}
                  </span>
                </button>
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    openAccordion === "description" ? "max-h-[300px] opacity-100 pb-4" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-[#6B6B6B] dark:text-gray-400 text-sm leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Specifications Accordion */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <div className="border-b border-[#E8E8E8] dark:border-white/5">
                  <button
                    onClick={() => toggleAccordion("specifications")}
                    className="w-full flex justify-between items-center py-4 text-left uppercase tracking-widest text-[10px] font-bold text-[#111111] dark:text-white hover:text-[#C9A84C] transition-colors"
                  >
                    <span>Specifications</span>
                    <span className="text-sm font-light">
                      {openAccordion === "specifications" ? "−" : "+"}
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      openAccordion === "specifications" ? "max-h-[400px] opacity-100 pb-4" : "max-h-0 opacity-0"
                    }`}
                  >
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        {Object.entries(product.specs).map(([key, value], i) => (
                          <tr key={key} className={i % 2 === 0 ? "bg-[#FAFAF8] dark:bg-white/[0.02]" : ""}>
                            <td className="text-[#6B6B6B] dark:text-gray-400 font-bold py-2.5 px-3 w-1/3 border-b border-[#E8E8E8] dark:border-white/5">{key}</td>
                            <td className="text-[#111111] dark:text-white py-2.5 px-3 border-b border-[#E8E8E8] dark:border-white/5">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Shipping Info Accordion */}
              <div className="border-b border-[#E8E8E8] dark:border-white/5">
                <button
                  onClick={() => toggleAccordion("shipping")}
                  className="w-full flex justify-between items-center py-4 text-left uppercase tracking-widest text-[10px] font-bold text-[#111111] dark:text-white hover:text-[#C9A84C] transition-colors"
                >
                  <span>Shipping & Returns</span>
                  <span className="text-sm font-light">
                    {openAccordion === "shipping" ? "−" : "+"}
                  </span>
                </button>
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    openAccordion === "shipping" ? "max-h-[300px] opacity-100 pb-4" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="text-[#6B6B6B] dark:text-gray-400 text-xs leading-relaxed space-y-2">
                    <p>• <strong>Free Express Shipping:</strong> Complimented on all orders. Standard delivery takes 3 to 5 business days.</p>
                    <p>• <strong>Secure Deliveries:</strong> All shipments are tracked with unique tracking codes, handoff OTPs, and fully insured carriers.</p>
                    <p>• <strong>Simplified Returns:</strong> Eligible items can be returned within the specified return policy timeline. Outbound/inbound return shipping labels are generated free of charge via your order page.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Customer Reviews & Ratings Dashboard */}
      <div 
        ref={reviewsSectionRef} 
        id="reviews-section" 
        className="max-w-7xl mx-auto px-6 py-16 border-t border-[#E8E8E8] dark:border-white/5 mt-12"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#111111] dark:text-white mb-1">Customer Reviews</h2>
            <p className="text-[#6B6B6B] dark:text-gray-400 text-sm">Honest ratings from verified Trendz purchasers.</p>
          </div>

          <button 
            onClick={() => {
              if (!currentUser) {
                toast.error("Please login to write a review.");
                navigate("/login");
              } else {
                setIsReviewModalOpen(true);
              }
            }}
            className="btn-gold px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase shadow-sm"
          >
            Write a Review
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Ratings Left Dashboard Panel */}
          <div className="bg-white dark:bg-[#111111]/30 border border-[#E8E8E8] dark:border-white/5 p-6 rounded-2xl shadow-card space-y-6">
            <div className="text-center py-4 border-b border-[#E8E8E8] dark:border-white/5">
              <div className="text-5xl font-black text-[#111111] dark:text-white mb-2 tracking-tight">
                {product.rating}
              </div>
              <div className="flex justify-center mb-2">
                <StarRating rating={product.rating} size="w-5 h-5" />
              </div>
              <p className="text-[#6B6B6B] dark:text-gray-400 text-xs uppercase tracking-widest font-bold">
                Overall Average Rating
              </p>
            </div>

            {/* Distribution Bar Chart */}
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => r.rating === star).length;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="text-[#111111] dark:text-white font-bold w-4">{star}★</span>
                    <div className="flex-1 h-2 bg-[#FAFAF8] dark:bg-white/5 rounded-full overflow-hidden border border-[#E8E8E8] dark:border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-[#C9A84C] to-[#9F833A] rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                    <span className="text-[#6B6B6B] dark:text-gray-400 w-8 text-right font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Reviews Right Panel List */}
          <div className="lg:col-span-2 space-y-6">
            {reviews.length === 0 ? (
              <div className="border border-dashed border-[#E8E8E8] dark:border-white/5 bg-white dark:bg-[#111111]/30 p-12 rounded-2xl text-center">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="font-semibold text-[#111111] dark:text-white mb-1">No Reviews Yet</h3>
                <p className="text-[#6B6B6B] dark:text-gray-400 text-sm max-w-sm mx-auto mb-4">Be the first to share your experience with this luxury product and help others make a selection.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => {
                  const localPhotos = getReviewPhotos(review.title);
                  return (
                    <div 
                      key={review._id || review.id} 
                      className="bg-white dark:bg-[#111111]/30 border border-[#E8E8E8] dark:border-white/5 p-6 rounded-2xl shadow-card"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          {/* User Avatar */}
                          <div className="w-9 h-9 rounded-full bg-[#FAFAF8] dark:bg-white/5 border border-[#E8E8E8] dark:border-white/5 flex items-center justify-center text-xs font-bold text-[#111111] dark:text-white uppercase shadow-sm">
                            {review.user?.firstName?.charAt(0) || "G"}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[#111111] dark:text-white block">
                              {review.user?.firstName ? `${review.user.firstName} ${review.user.lastName || ""}` : "Guest Shopper"}
                            </span>
                            <span className="text-[#6B6B6B]/50 dark:text-gray-500 text-[10px] block font-medium">
                              {new Date(review.createdAt || review.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Rating stars */}
                        <div className="flex flex-col items-end">
                          <StarRating rating={review.rating} size="w-3.5 h-3.5" />
                          {review.verified !== false && (
                            <span className="text-[8px] bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest mt-1">
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Review Title */}
                      <h4 className="font-bold text-sm text-[#111111] dark:text-white mb-1.5">{review.title}</h4>
                      
                      {/* Review Text */}
                      <p className="text-[#6B6B6B] dark:text-gray-400 text-xs leading-relaxed mb-4 font-medium">{review.text}</p>

                      {/* Display Uploaded Review Photos */}
                      {localPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {localPhotos.map((url, index) => (
                            <div 
                              key={index} 
                              onClick={() => setPreviewImage(url)}
                              className="w-14 h-14 rounded-lg overflow-hidden border border-[#E8E8E8] dark:border-white/5 cursor-pointer hover:opacity-90 hover:scale-95 transition-all flex-shrink-0"
                            >
                              <img src={url} alt="Review attachment" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Helpful votes */}
                      <div className="flex items-center gap-4 text-[10px] text-[#6B6B6B] dark:text-gray-400 border-t border-[#E8E8E8] dark:border-white/5 pt-3 mt-2 font-medium">
                        <span>Was this review helpful?</span>
                        <button 
                          onClick={() => handleHelpful(review._id || review.id)} 
                          className="hover:text-[#C9A84C] font-bold flex items-center gap-1 hover:underline transition-colors"
                        >
                          👍 Yes ({review.helpful || 0})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#E8E8E8] dark:border-white/5 bg-[#FAFAF8] dark:bg-[#0A0A0A]">
          <h2 className="font-display text-2xl font-bold text-center text-[#111111] dark:text-white mb-10 tracking-widest uppercase">
            YOU MAY ALSO LIKE
          </h2>
          <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-none py-4">
            <div className="flex gap-6 w-max">
              {relatedProducts.slice(0, 8).map((p) => (
                <div key={p.id} className="w-72 snap-start flex-shrink-0">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WRITE A REVIEW MODAL */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsReviewModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-2xl w-full max-w-lg p-6 shadow-luxury transform transition-all relative z-10 animate-pop-in max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[#E8E8E8] dark:border-white/5 pb-4 mb-4">
              <h3 className="font-display text-lg font-bold text-[#111111] dark:text-white">Write A Review</h3>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="text-[#6B6B6B] hover:text-[#C9A84C] text-xl font-light focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#6B6B6B] dark:text-gray-400 font-bold mb-2">
                  Select Rating
                </label>
                <div className="flex gap-1.5 items-center bg-[#FAFAF8] dark:bg-[#0A0A0A] p-3 rounded-xl border border-[#E8E8E8] dark:border-white/5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setReviewRating(star)}
                      className="text-[#C9A84C] focus:outline-none transition-transform duration-150 hover:scale-110"
                    >
                      <svg
                        className={`w-8 h-8 ${
                          star <= (hoverRating || reviewRating) ? "text-[#C9A84C] fill-current" : "text-border fill-none stroke-current"
                        }`}
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[#C9A84C] ml-3">
                    {ratingLabels[hoverRating || reviewRating]}
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#6B6B6B] dark:text-gray-400 font-bold mb-1.5">
                  Review Title
                </label>
                <input 
                  type="text" 
                  value={reviewTitle} 
                  onChange={(e) => setReviewTitle(e.target.value)} 
                  required 
                  placeholder="Summarize your experience..." 
                  className="input-field w-full px-4 py-2.5 rounded-xl text-xs placeholder:text-[#6B6B6B]/40 font-medium bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#111111] dark:text-white border border-[#E8E8E8] dark:border-white/5 focus:outline-none focus:border-[#C9A84C]" 
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#6B6B6B] dark:text-gray-400 font-bold mb-1.5">
                  Detailed Review
                </label>
                <textarea 
                  value={reviewText} 
                  onChange={(e) => setReviewText(e.target.value)} 
                  required 
                  placeholder="What did you like or dislike? How is the fitting and material quality?" 
                  rows={4} 
                  className="input-field w-full px-4 py-2.5 rounded-xl text-xs resize-none placeholder:text-[#6B6B6B]/40 font-medium bg-[#FAFAF8] dark:bg-[#0A0A0A] text-[#111111] dark:text-white border border-[#E8E8E8] dark:border-white/5 focus:outline-none focus:border-[#C9A84C]" 
                />
              </div>

              {/* Mock Photo Upload Dropzone */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#6B6B6B] dark:text-gray-400 font-bold mb-1.5">
                  Attach Review Photos (Optional)
                </label>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-[#E8E8E8] dark:border-white/5 hover:border-[#6B6B6B] bg-[#FAFAF8] dark:bg-[#0A0A0A] hover:bg-white dark:hover:bg-[#111111] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <span className="text-xl mb-1">📸</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Click to add photos
                  </span>
                  <span className="text-[9px] text-[#6B6B6B]/40 mt-0.5">JPEG, PNG up to 5MB</span>
                </div>

                {/* Selected Photos Previews */}
                {mockPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-3 bg-[#FAFAF8] dark:bg-[#0A0A0A] p-2.5 rounded-xl border border-[#E8E8E8] dark:border-white/5">
                    {mockPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#E8E8E8] dark:border-white/5 group">
                        <img src={url} alt="Review attachment preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(idx);
                          }}
                          className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                          title="Remove Photo"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-[#E8E8E8] dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 py-3 border border-[#E8E8E8] dark:border-white/5 text-[#111111] dark:text-white bg-white dark:bg-[#111111] hover:bg-[#FAFAF8] dark:hover:bg-white/5 rounded-xl text-xs uppercase tracking-widest font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingReview}
                  className="flex-1 btn-gold py-3 rounded-xl text-xs uppercase tracking-widest font-bold disabled:opacity-50"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-[#0A0A0A]/85 backdrop-blur-sm transition-opacity" 
            onClick={() => setPreviewImage(null)}
          />
          <div className="relative z-10 max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-white/10 animate-pop-in">
            <img src={previewImage} alt="Review attachment full screen" className="w-full h-full max-h-[80vh] object-contain" />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white bg-black/60 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all border border-white/10"
            >
              &times;
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
