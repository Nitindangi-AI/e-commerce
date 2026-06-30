import { Link } from "react-router-dom";
import { FiInstagram, FiTwitter, FiFacebook, FiYoutube, FiSend } from "react-icons/fi";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Thank you for subscribing to TRENDZ!");
    setEmail("");
  };

  const quickLinks = [
    { name: "Shop All", to: "/shop" },
    { name: "About Us", to: "#" },
    { name: "Careers", to: "#" },
    { name: "Become a Seller", to: "/vendor-register" },
  ];

  const categories = [
    { name: "Watches", to: "/shop?category=Watches" },
    { name: "Eyewear", to: "/shop?category=Eyewear" },
    { name: "Footwear", to: "/shop?category=Footwear" },
    { name: "Accessories", to: "/shop?category=Accessories" },
    { name: "Shirts", to: "/shop?category=Shirts" },
    { name: "Grooming", to: "/shop?category=Grooming" },
  ];

  return (
    <footer className="bg-[#0A0A0A] text-white border-t border-white/5">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Column 1: Brand Story */}
          <div className="space-y-6">
            <Link to="/" className="font-display text-2xl font-bold tracking-[0.25em] uppercase text-[#C9A84C] hover:scale-105 transition-transform duration-300 inline-block select-none">
              TRENDZ
            </Link>
            <p className="text-white/60 text-xs leading-relaxed max-w-sm">
              Curated luxury for those who define their own standard. Timeless pieces, uncompromising craft, delivered to your doorstep.
            </p>
            {/* Social Icons (Minimal Outline Style) */}
            <div className="flex items-center gap-3">
              {[
                { name: "Instagram", icon: <FiInstagram size={16} /> },
                { name: "Twitter", icon: <FiTwitter size={16} /> },
                { name: "Facebook", icon: <FiFacebook size={16} /> },
                { name: "Youtube", icon: <FiYoutube size={16} /> },
              ].map(social => (
                <a
                  key={social.name}
                  href="#"
                  aria-label={social.name}
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:border-[#C9A84C] hover:text-[#C9A84C] hover:scale-110 transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C] font-bold mb-6">Quick Links</h4>
            <ul className="space-y-3.5">
              {quickLinks.map(link => (
                <li key={link.name}>
                  <Link to={link.to} className="text-xs text-white/60 hover:text-[#C9A84C] transition-colors duration-250 font-medium">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div>
            <h4 className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C] font-bold mb-6">Categories</h4>
            <ul className="space-y-3.5">
              {categories.map(link => (
                <li key={link.name}>
                  <Link to={link.to} className="text-xs text-white/60 hover:text-[#C9A84C] transition-colors duration-250 font-medium">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter signup */}
          <div className="space-y-6">
            <h4 className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C] font-bold">Newsletter</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Subscribe to receive updates on new arrivals, collections, and exclusive member-only offers.
            </p>
            <form onSubmit={handleSubscribe} className="relative flex items-center w-full max-w-sm">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-4 pr-12 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3 bg-[#C9A84C] hover:bg-[#B5963F] text-black hover:text-white rounded-full flex items-center justify-center transition-all duration-300"
                aria-label="Subscribe"
              >
                <FiSend size={12} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5 py-8 bg-[#070707]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-white/30 text-xs">© 2025 TRENDZ. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6 text-[10px] tracking-wider uppercase text-white/30 font-medium">
            <a href="#" className="hover:text-[#C9A84C] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#C9A84C] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#C9A84C] transition-colors">Cookies Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}