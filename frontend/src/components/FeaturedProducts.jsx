import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ProductCard from "./ProductCard";
import { productAPI } from "../services/api";
import localProducts from "../data/product";

export default function FeaturedProducts() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState(localProducts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await productAPI.getAll("sort=featured&limit=100");
        if (res.success && res.products?.length > 0) {
          setProducts(res.products);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFeatured();
  }, []);

  const categories = ["All", "Shirts", "Pants", "Belts", "Eyewear", "Footwear", "Accessories", "Watches", "Perfumes"];
  const filtered = activeCategory === "All" ? products.slice(0, 8) : products.filter(p => p.category === activeCategory);

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
        <motion.div
          initial={{ opacity: 0, y: 35, rotateX: 20, transformPerspective: 1000 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="text-xs tracking-[0.4em] uppercase gold mb-3">Curated Selection</p>
          <h2 className="luxe-header-3d text-4xl md:text-5xl font-black tracking-wide pb-1">Featured Pieces</h2>
        </motion.div>
        <div className="mt-6 md:mt-0">
          <select 
            value={activeCategory} 
            onChange={(e) => setActiveCategory(e.target.value)}
            className="px-5 py-2.5 rounded-full text-xs tracking-widest uppercase border border-[#e8e4d5] bg-white/75 text-[#3d3522] hover:border-[#d4af37]/40 focus:outline-none focus:border-[#d4af37] [&>option]:bg-[#faf8f5] [&>option]:text-[#3d3522] font-bold shadow-sm cursor-pointer"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <svg className="w-8 h-8 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <div className="text-center mt-14">
        <Link to="/shop" className="btn-outline px-12 py-4 rounded-full text-sm tracking-widest uppercase inline-block">
          View All Products
        </Link>
      </div>
    </section>
  );
}