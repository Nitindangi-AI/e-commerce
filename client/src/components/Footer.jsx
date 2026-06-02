import { Link } from "react-router-dom";

const footerLinks = {
  Shop: [
    { name: "New Arrivals", to: "/shop?badge=New" },
    { name: "Watches", to: "/shop?category=Watches" },
    { name: "Eyewear", to: "/shop?category=Eyewear" },
    { name: "Footwear", to: "/shop?category=Footwear" },
    { name: "Accessories", to: "/shop?category=Accessories" },
  ],
  Company: [
    { name: "About Us", to: "#" },
    { name: "Careers", to: "#" },
    { name: "Press", to: "#" },
    { name: "Blog", to: "#" },
    { name: "Become a Seller", to: "/register" },
  ],
  Support: [
    { name: "Help Center", to: "#" },
    { name: "Shipping", to: "#" },
    { name: "Returns", to: "#" },
    { name: "Size Guide", to: "#" },
    { name: "Contact", to: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-[#3d3522]/15 bg-[#f5f2e8]/85 backdrop-blur-md">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="display text-2xl font-black tracking-[0.25em] uppercase gold inline-block mb-4 hover:scale-105 transition-transform duration-300 select-none gold-gradient-text">
              Trendz
            </Link>
            <p className="text-[#3d3522]/60 text-sm leading-relaxed max-w-sm mb-6">
              Curated luxury for those who define their own standard. Timeless pieces, uncompromising craft, delivered to your doorstep.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {[
                { name: "Instagram", icon: "M7.8 2h8.4C19 2 22 5 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C5 22 2 19 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8A3.6 3.6 0 007.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6A3.6 3.6 0 0016.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z" },
                { name: "Twitter", icon: "M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.38 8.59 8.59 0 01-2.72 1.04 4.28 4.28 0 00-7.32 3.91A12.16 12.16 0 013.16 4.86a4.28 4.28 0 001.32 5.72 4.24 4.24 0 01-1.94-.54v.05a4.28 4.28 0 003.43 4.2 4.27 4.27 0 01-1.93.07 4.29 4.29 0 004 2.98A8.6 8.6 0 012 18.58a12.13 12.13 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.37-.01-.56A8.72 8.72 0 0022.46 6z" },
                { name: "Facebook", icon: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
              ].map(social => (
                <a key={social.name} href="#" aria-label={social.name}
                  className="w-10 h-10 rounded-full border border-[#3d3522]/15 flex items-center justify-center text-[#3d3522]/50 hover:border-[#d4af37] hover:text-[#9d7d3a] transition-all duration-300">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs tracking-[0.3em] uppercase text-[#3d3522]/75 font-semibold mb-5">{title}</h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.name}>
                    <Link to={link.to} className="text-sm text-[#3d3522]/55 hover:text-[#9d7d3a] transition-colors duration-200 font-medium">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#3d3522]/15">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#3d3522]/40 text-xs">© 2026 TRENDZ. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-[#3d3522]/40 font-medium">
            <a href="#" className="hover:text-[#3d3522] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#3d3522] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#3d3522] transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}