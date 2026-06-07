import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import BackToTop from "../components/BackToTop";
import Chatbot from "../components/Chatbot";
import { useThemeStore } from "../store/useThemeStore";
import { useSearchStore } from "../store/useSearchStore";
import { useAuthStore } from "../store/useAuthStore";
import SearchDropdown from "../components/SearchDropdown";
import { AnimatePresence } from "framer-motion";

export default function MainLayout() {
  const location = useLocation();
  const applyTheme = useThemeStore((state) => state.applyTheme);
  const theme = useThemeStore((state) => state.theme);
  const searchOpen = useSearchStore((state) => state.searchOpen);

  useEffect(() => {
    applyTheme();
  }, [theme, applyTheme]);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);
  
  return (
    <div className="min-h-screen font-sans flex flex-col overflow-x-hidden relative bg-[#FAFAF8] transition-colors duration-500">
      {/* Elegant Ambient Pastel Blur Spheres ( Vibe & Smoothness ) */}
      <div className="absolute top-[-100px] left-[-150px] w-[500px] h-[500px] rounded-full bg-rose-400/8 blur-[120px] pointer-events-none z-0 mix-blend-screen transition-all duration-700" />
      <div className="absolute top-[25%] right-[-200px] w-[600px] h-[600px] rounded-full bg-sky-400/8 blur-[130px] pointer-events-none z-0 mix-blend-screen transition-all duration-700" />
      <div className="absolute top-[60%] left-[-100px] w-[550px] h-[550px] rounded-full bg-sky-200/6 blur-[110px] pointer-events-none z-0 mix-blend-screen transition-all duration-700" />
      <div className="absolute bottom-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full bg-amber-200/5 blur-[120px] pointer-events-none z-0 mix-blend-screen transition-all duration-700" />

      {/* Website Shell (Layer 1) - Scales and rounds elegantly like macOS/iOS sheets */}
      <div 
        className={`relative z-10 flex flex-col min-h-screen w-full transition-all duration-500 origin-center bg-[#FAFAF8] ${
          searchOpen 
            ? "scale-[0.985] rounded-[24px] shadow-[0_24px_80px_rgba(43,43,40,0.12)] overflow-hidden pointer-events-none" 
            : "scale-100 rounded-none shadow-none"
        }`}
      >
        <ScrollToTop />
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0" key={location.pathname}>
          <Outlet />
        </main>
        <Footer />
        <BackToTop />
        <Chatbot />
      </div>

      {/* Search Overlay & Floating Modal (Layer 2 & 3) */}
      <AnimatePresence>
        {searchOpen && <SearchDropdown onClose={() => useSearchStore.getState().setSearchOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
