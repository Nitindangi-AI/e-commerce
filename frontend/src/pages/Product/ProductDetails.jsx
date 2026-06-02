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
    toast.success(`${product.name} (${qty} items) added to cart!`);
  };

  const checkPincode = () => {
    if (pincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setPincodeResult({ available: true, days: product.deliveryDays || 3, cod: true });
  };

  const handleMagnifierMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
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

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + (product.deliveryDays || 3));
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

  return (
    <div className="bg-background min-h-screen pt-20">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2 text-[10px] text-secondary tracking-widest uppercase flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <span>/</span>
          <Link to={`/shop?category=${product.category}`} className="hover:text-primary transition-colors">{product.category}</Link>
          <span>/</span>
          <span className="text-primary font-semibold truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-12 bg-surface border border-border p-6 md:p-8 rounded-3xl shadow-card">
          
          {/* Gallery - Left Column */}
          <div className="lg:w-1/2 flex flex-col gap-4">
            {/* Large Main Image with Zoom Magnifier */}
            <div 
              className="relative aspect-square w-full rounded-2xl overflow-hidden bg-background border border-border cursor-zoom-in group"
              onMouseMove={handleMagnifierMove}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
            >
              <img 
                src={images[selectedImage]} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-200"
                style={{
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transform: isZoomed ? "scale(2)" : "scale(1)",
                }}
              />
              
              {/* Product Badge */}
              {product.badge && (
                <span className={`absolute top-4 left-4 text-[9px] tracking-widest uppercase px-3 py-1 rounded-full font-bold tag-${product.badge.toLowerCase()} shadow-sm`}>
                  {product.badge}
                </span>
              )}

              {/* Low Stock Warning */}
              {product.stock > 0 && product.stock <= 5 && (
                <div className="absolute bottom-4 left-4 bg-red-500/90 backdrop-blur-sm text-white text-[10px] tracking-wider uppercase font-bold px-3 py-1.5 rounded-full shadow-md">
                  Only {product.stock} units left!
                </div>
              )}

              {product.stock === 0 && (
                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                  <span className="bg-primary text-white text-xs tracking-[0.2em] uppercase font-bold px-6 py-3 rounded-full shadow-lg">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip - Below Image */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none justify-start">
                {images.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border transition-all flex-shrink-0 ${
                      i === selectedImage 
                        ? "border-[#C9A84C] ring-2 ring-[#C9A84C]/10 scale-95" 
                        : "border-border hover:border-text-secondary"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details - Right Column */}
          <div className="lg:w-1/2 flex flex-col justify-between">
            <div>
              {/* Brand and Category */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#6B6B6B] text-[11px] tracking-[0.3em] uppercase font-semibold">
                  {product.brand} · {product.category}
                </span>
              </div>

              {/* Product Title */}
              <h1 className="display text-3xl md:text-4xl font-semibold text-primary mb-3 leading-tight">
                {product.name}
              </h1>

              {/* Ratings Summary Link */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-1.5 bg-[#C9A84C]/10 text-[#C9A84C] px-2.5 py-1 rounded-lg text-sm font-bold border border-[#C9A84C]/20">
                  <span>{product.rating}</span>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <a 
                  href="#reviews" 
                  onClick={scrollToReviews}
                  className="text-secondary hover:text-primary text-xs font-semibold hover:underline"
                >
                  ({reviews.length} Customer Reviews)
                </a>
              </div>

              {/* Price Panel */}
              <div className="border-y border-border py-4 mb-6">
                <div className="flex items-baseline gap-4 mb-1">
                  <span className="text-primary font-bold text-3xl tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <>
                      <span className="text-secondary/50 text-lg line-through font-medium">
                        {formatPrice(product.originalPrice)}
                      </span>
                      <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full border border-green-500/20">
                        SAVE {discount}%
                      </span>
                    </>
                  )}
                </div>
                <p className="text-secondary/50 text-[10px] tracking-widest uppercase">inclusive of all taxes & duties</p>
              </div>

              {/* Partner Store Link (if verified vendor) */}
              {vendorInfo && (
                <Link to={`/store/${vendorInfo.user_id}`}
                  className="flex items-center gap-3 mb-6 p-4 bg-background border border-border rounded-2xl hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {vendorInfo.store_logo ? (
                      <img src={vendorInfo.store_logo} alt={vendorInfo.store_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#C9A84C] font-bold text-sm">{vendorInfo.store_name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary truncate">{vendorInfo.store_name}</span>
                      <span className="text-[8px] bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest">Verified Partner</span>
                    </div>
                    <p className="text-[10px] text-secondary tracking-wider mt-0.5">Explore full collection storefront →</p>
                  </div>
                  <svg className="w-4 h-4 text-secondary/40 group-hover:text-[#C9A84C] group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}

              {/* Color Swatch Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6">
                  <span className="text-[10px] tracking-widest uppercase text-secondary block font-bold mb-2.5">
                    Color: <span className="text-primary font-bold">{product.colors[selectedColor]}</span>
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
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                            isSelected ? "border-[#C9A84C] ring-2 ring-[#C9A84C]/25" : "border-border hover:border-secondary"
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
                  <span className="text-[10px] tracking-widest uppercase text-secondary block font-bold mb-2.5">
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
                          className={`relative w-14 h-10 rounded-lg text-xs font-semibold border flex items-center justify-center transition-all ${
                            isOutOfStock
                              ? "border-border text-secondary/40 bg-background cursor-not-allowed overflow-hidden"
                              : isSelected
                              ? "bg-primary text-white border-primary"
                              : "border-border text-primary hover:border-primary bg-surface"
                          }`}
                        >
                          {s}
                          {isOutOfStock && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="w-[140%] h-[1px] bg-secondary/35 rotate-12 transform origin-center" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity + Add to Cart + Wishlist */}
              <div className="flex items-center gap-4 mb-4">
                {/* Quantity Control */}
                <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden h-12">
                  <button 
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={product.stock === 0}
                    className="px-4 h-full text-secondary hover:text-primary disabled:opacity-50 text-lg transition-colors font-medium"
                  >
                    −
                  </button>
                  <span className="px-2 text-sm font-semibold w-10 text-center text-primary">{qty}</span>
                  <button 
                    onClick={() => setQty((q) => q + 1)}
                    disabled={product.stock === 0}
                    className="px-4 h-full text-secondary hover:text-primary disabled:opacity-50 text-lg transition-colors font-medium"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <button 
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="btn-gold h-12 px-8 rounded-xl text-xs tracking-widest uppercase font-bold flex-1 disabled:opacity-50"
                >
                  Add to Cart
                </button>

                {/* Wishlist Heart Toggle */}
                <button 
                  onClick={() => {
                    toggleWishlist(product);
                    toast(isInWishlist ? "Removed from wishlist" : "Added to wishlist ♡", {
                      icon: isInWishlist ? "💔" : "❤️",
                    });
                  }}
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                    isInWishlist 
                      ? "border-red-200 text-red-500 bg-red-500/5 hover:bg-red-500/10" 
                      : "border-border text-secondary hover:border-secondary hover:text-primary"
                  }`}
                  title="Add to Wishlist"
                >
                  <svg className="w-5 h-5" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Express checkout "Buy Now" */}
              {product.stock > 0 && (
                <button 
                  onClick={() => {
                    handleAddToCart();
                    navigate("/checkout");
                  }} 
                  className="w-full py-3.5 rounded-xl text-xs tracking-widest uppercase font-bold bg-[#111111] hover:bg-[#282828] text-white transition-colors mb-6 shadow-sm"
                >
                  Express Checkout
                </button>
              )}

              {/* Delivery and Pincode Check */}
              <div className="border border-border rounded-2xl p-4 bg-background/50 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">Delivery & Availability</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    value={pincode} 
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                    placeholder="Enter Pincode"
                    className="input-field flex-1 px-4 py-2.5 rounded-lg text-xs" 
                    maxLength={6} 
                  />
                  <button 
                    onClick={checkPincode}
                    className="text-[#C9A84C] text-xs font-bold hover:underline px-3 border border-border rounded-lg bg-surface hover:bg-background"
                  >
                    Check
                  </button>
                </div>
                {pincodeResult && (
                  <div className="mt-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <span>✓</span> 
                      <span>Delivery by <strong>{deliveryDateStr}</strong></span>
                    </div>
                    {pincodeResult.cod && (
                      <div className="flex items-center gap-2 text-secondary">
                        <span>✓</span> 
                        <span>Cash on Delivery is available</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-secondary">
                      <span>✓</span> 
                      <span>Free shipping {product.price >= 5000 ? "applied" : "on orders above ₹5,000"}</span>
                    </div>
                  </div>
                )}
                {!pincodeResult && (
                  <p className="text-secondary/50 text-[10px] tracking-wider mt-2.5 uppercase">
                    Usually dispatched in {product.deliveryDays || 3} business days.
                  </p>
                )}
              </div>

              {/* Brand Highlights Checklist */}
              <div className="grid grid-cols-2 gap-3.5 border-t border-border pt-5">
                {[
                  ["🚚", "Free Express Delivery"],
                  ["🔒", "Secure Checkout Payments"],
                  ["↩️", "Simple 30-Day Returns"],
                  ["✦", "100% Genuine Luxury"]
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-2 text-secondary text-xs font-medium">
                    <span className="text-sm">{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* Details Accordion Panel */}
            <div className="border-t border-border mt-8 pt-4 space-y-2">
              {/* Description Accordion */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleAccordion("description")}
                  className="w-full flex justify-between items-center py-4 text-left uppercase tracking-widest text-[10px] font-bold text-primary hover:text-[#C9A84C] transition-colors"
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
                  <p className="text-secondary text-sm leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Specifications Accordion */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <div className="border-b border-border">
                  <button
                    onClick={() => toggleAccordion("specifications")}
                    className="w-full flex justify-between items-center py-4 text-left uppercase tracking-widest text-[10px] font-bold text-primary hover:text-[#C9A84C] transition-colors"
                  >
                    <span>Specifications</span>
                    <span className="text-sm font-light">
                      {openAccordion === "specifications" ? "−" : "+"}
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      openAccordion === "specifications" ? "max-h-[400px] opacity-100 pb-4 overflow-y-auto" : "max-h-0 opacity-0"
                    }`}
                  >
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        {Object.entries(product.specs).map(([key, value], i) => (
                          <tr key={key} className={i % 2 === 0 ? "bg-background/60" : ""}>
                            <td className="text-secondary font-bold py-2.5 px-3 w-1/3 border-b border-border/50">{key}</td>
                            <td className="text-primary py-2.5 px-3 border-b border-border/50">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Shipping & Returns Accordion */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleAccordion("shipping")}
                  className="w-full flex justify-between items-center py-4 text-left uppercase tracking-widest text-[10px] font-bold text-primary hover:text-[#C9A84C] transition-colors"
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
                  <div className="text-secondary text-sm leading-relaxed space-y-2">
                    <p>• <strong>Free Express Shipping:</strong> Complimented on all orders over ₹5,000. Orders under ₹5,000 incur a standard flat rate shipping fee of ₹299.</p>
                    <p>• <strong>Delivery Timeline:</strong> Dispatched within 24-48 business hours. Average delivery takes 2 to 5 business days depending on region.</p>
                    <p>• <strong>Easy 30-Day Returns:</strong> Returns are accepted within 30 days of shipment for any unused products in original brand packaging. Simply contact support to generate a free return courier label.</p>
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
        className="max-w-7xl mx-auto px-6 py-16 border-t border-border mt-12"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="display text-2xl font-bold text-primary mb-1">Customer Reviews</h2>
            <p className="text-secondary text-sm">Honest ratings from verified Trendy purchasers.</p>
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
          <div className="bg-surface border border-border p-6 rounded-2xl shadow-card space-y-6">
            <div className="text-center py-4 border-b border-border">
              <div className="text-5xl font-black text-primary mb-2 tracking-tight">
                {product.rating}
              </div>
              <div className="flex justify-center mb-2">
                <StarRating rating={product.rating} size="w-5 h-5" />
              </div>
              <p className="text-secondary text-xs uppercase tracking-widest font-semibold">
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
                    <span className="text-primary font-bold w-4">{star}★</span>
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full bg-gradient-to-r from-[#C9A84C] to-[#9F833A] rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                    <span className="text-secondary w-8 text-right font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Reviews Right Panel List */}
          <div className="lg:col-span-2 space-y-6">
            {reviews.length === 0 ? (
              <div className="border border-dashed border-border bg-surface p-12 rounded-2xl text-center">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="font-semibold text-primary mb-1">No Reviews Yet</h3>
                <p className="text-secondary text-sm max-w-sm mx-auto mb-4">Be the first to share your experience with this luxury product and help others make a selection.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => {
                  const localPhotos = getReviewPhotos(review.title);
                  return (
                    <div 
                      key={review._id || review.id} 
                      className="bg-surface border border-border p-6 rounded-2xl shadow-card"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          {/* User Avatar */}
                          <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-primary uppercase shadow-sm">
                            {review.user?.firstName?.charAt(0) || "G"}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-primary block">
                              {review.user?.firstName ? `${review.user.firstName} ${review.user.lastName || ""}` : "Guest Shopper"}
                            </span>
                            <span className="text-secondary/50 text-[10px] block">
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
                            <span className="text-[8px] bg-green-500/10 text-green-600 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest mt-1">
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Review Title */}
                      <h4 className="font-bold text-sm text-primary mb-1.5">{review.title}</h4>
                      
                      {/* Review Text */}
                      <p className="text-secondary text-xs leading-relaxed mb-4">{review.text}</p>

                      {/* Display Uploaded Review Photos */}
                      {localPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {localPhotos.map((url, index) => (
                            <div 
                              key={index} 
                              onClick={() => setPreviewImage(url)}
                              className="w-14 h-14 rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-90 hover:scale-95 transition-all flex-shrink-0"
                            >
                              <img src={url} alt="Review attachment" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Helpful votes */}
                      <div className="flex items-center gap-4 text-[10px] text-secondary border-t border-border pt-3 mt-2">
                        <span>Was this review helpful?</span>
                        <button 
                          onClick={() => handleHelpful(review._id || review.id)} 
                          className="hover:text-primary font-bold flex items-center gap-1 hover:underline transition-colors"
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
        <section className="max-w-7xl mx-auto px-6 py-16 border-t border-border bg-background">
          <h2 className="display text-2xl font-bold text-center text-primary mb-10 tracking-widest uppercase">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {relatedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
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
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg p-6 shadow-luxury transform transition-all relative z-10 animate-pop-in max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
              <h3 className="display text-lg font-bold text-primary">Write A Review</h3>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="text-secondary hover:text-primary text-xl font-light focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-2">
                  Select Rating
                </label>
                <div className="flex gap-1.5 items-center bg-background p-3 rounded-xl border border-border">
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
                <label className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-1.5">
                  Review Title
                </label>
                <input 
                  type="text" 
                  value={reviewTitle} 
                  onChange={(e) => setReviewTitle(e.target.value)} 
                  required 
                  placeholder="Summarize your experience..." 
                  className="input-field w-full px-4 py-2.5 rounded-xl text-xs placeholder:text-secondary/40 font-medium" 
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-1.5">
                  Detailed Review
                </label>
                <textarea 
                  value={reviewText} 
                  onChange={(e) => setReviewText(e.target.value)} 
                  required 
                  placeholder="What did you like or dislike? How is the fitting and material quality?" 
                  rows={4} 
                  className="input-field w-full px-4 py-2.5 rounded-xl text-xs resize-none placeholder:text-secondary/40 font-medium" 
                />
              </div>

              {/* Mock Photo Upload Dropzone */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-secondary font-bold mb-1.5">
                  Attach Review Photos (Optional)
                </label>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-border hover:border-secondary bg-background hover:bg-surface/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    Click to add photos
                  </span>
                  <span className="text-[9px] text-secondary/40 mt-0.5">JPEG, PNG up to 5MB</span>
                </div>

                {/* Selected Photos Previews */}
                {mockPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-3 bg-background p-2.5 rounded-xl border border-border">
                    {mockPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-border group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
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
              <div className="flex gap-3 pt-3 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 py-3 border border-border text-[#111111] bg-surface hover:bg-background rounded-xl text-xs uppercase tracking-widest font-bold transition-colors"
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
          <div className="relative z-10 max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-border/10 animate-pop-in">
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
