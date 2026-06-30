import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getProductImageUrl } from "../utils/image";

export default function DealOfTheDay() {
  const offers = [
    {
      discount: 50,
      title: "Half Price Steals",
      desc: "Premium items at 50% off or more. Unbeatable value.",
      img: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop",
    },
    {
      discount: 40,
      title: "Major Discounts",
      desc: "Get 40% off on top-rated fashion & accessories.",
      img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=800&auto=format&fit=crop",
    },
    {
      discount: 30,
      title: "Sweet Savings",
      desc: "Enjoy 30% off our curated seasonal collection.",
      img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop",
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 35, rotateX: 20, transformPerspective: 1000 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-10 select-none"
      >
        <p className="text-xs tracking-[0.4em] uppercase gold mb-3">Limited Time</p>
        <h2 className="luxe-header-3d text-4xl md:text-5xl font-black tracking-wide pb-1">Special Offers</h2>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {offers.map((offer, index) => (
          <motion.div
            key={offer.discount}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
            className="h-full"
          >
            <Link to={`/shop?minDiscount=${offer.discount}`} className="group relative block w-full rounded-3xl overflow-hidden aspect-[4/3] border border-[#e8e4d5]/80 bg-luxe-card hover:border-[#d4af37]/35 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-500 ease-out">
              <img
                src={getProductImageUrl(offer.img, 'thumbnail')}
                srcSet={`${getProductImageUrl(offer.img, 'thumbnail')} 400w, ${getProductImageUrl(offer.img, 'detail')} 800w`}
                sizes="(max-width: 600px) 400px, 800px"
                loading="lazy"
                decoding="async"
                width={400}
                height={400}
                alt={offer.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-60 group-hover:opacity-85"
              />
              {/* Soft light gradient fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#faf8f5]/95 via-[#faf8f5]/45 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                {/* Premium light frosted overlay panel */}
                <div className="bg-white/70 backdrop-blur-md border border-[#e8e4d5] rounded-2xl p-5 shadow-[0_12px_24px_rgba(181,170,143,0.12)] transition-all duration-300 group-hover:border-[#d4af37]/35">
                  <div className="inline-flex w-max items-center gap-2 bg-gradient-to-r from-[#b91c1c] to-[#d97706] text-white px-3 py-0.5 rounded-full text-[10px] font-bold mb-3 shadow-[0_4px_10px_rgba(185,28,28,0.15)]">
                    {offer.discount}% OFF
                  </div>
                  <h3 className="display text-xl font-bold mb-1.5 text-[#3d3522] group-hover:text-[#9d7d3a] transition-colors duration-300">{offer.title}</h3>
                  <p className="text-[#3d3522]/70 text-xs leading-relaxed line-clamp-2">{offer.desc}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
