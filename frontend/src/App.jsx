import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { insforge } from "./lib/insforge";

import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/Home/HomePage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ShopPage from "./pages/Shop/ShopPage";
import CartPage from "./pages/Cart/CartPage";
import ProductDetails from "./pages/Product/ProductDetails";
import WishlistPage from "./pages/Wishlist/WishlistPage";
import SearchResultsPage from "./pages/Search/SearchResultsPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import OrderSuccessPage from "./pages/Checkout/OrderSuccessPage";
import AccountPage from "./pages/Account/AccountPage";
import OrderDetailPage from "./pages/Account/OrderDetailPage";
import StorefrontView from "./pages/Shop/StorefrontView";
import NotFound from "./pages/NotFound";

// Multi-Vendor Portal Imports
import RoleGuard from "./components/RoleGuard";
import VendorDashboard from "./pages/Vendor/VendorDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";

function App() {
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    // 1. Session persistence check on initial load:
    const handleLoad = () => {
      const rememberMe = localStorage.getItem("remember_me") === "true";
      const sessionActive = sessionStorage.getItem("session_active") === "true";
      if (!rememberMe && !sessionActive) {
        insforge.auth.signOut().catch(console.error);
      }
    };
    window.addEventListener("load", handleLoad);

    // 2. Setup subscription to state changes to detect unexpected session expiry
    const { data: { subscription } } = insforge.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        sessionStorage.setItem("session_active", "true");
        sessionStorage.removeItem("manual_logout");
      } else {
        const wasActive = sessionStorage.getItem("session_active") === "true";
        const wasManual = sessionStorage.getItem("manual_logout") === "true";
        if (wasActive && !wasManual) {
          setShowExpiredModal(true);
        }
        sessionStorage.removeItem("session_active");
      }
    });

    return () => {
      window.removeEventListener("load", handleLoad);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'custom-toast',
          style: {
            background: '#FDF7E7',
            color: '#B5963F',
            border: '1px solid #E2CD8A',
            fontSize: '13px',
            fontWeight: 'bold',
            borderRadius: '12px',
          },
          success: {
            style: {
              background: '#DCFCE7',
              color: '#15803D',
              border: '1px solid #BBF7D0',
            },
            iconTheme: {
              primary: '#15803D',
              secondary: '#DCFCE7',
            },
          },
          error: {
            style: {
              background: '#FEE2E2',
              color: '#B91C1C',
              border: '1px solid #FCA5A5',
            },
            iconTheme: {
              primary: '#B91C1C',
              secondary: '#FEE2E2',
            },
          },
        }}
      />
      <Routes>
        {/* ── Customer Storefront ── */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="product/:id" element={<ProductDetails />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-success" element={<OrderSuccessPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="store/:vendorId" element={<StorefrontView />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Vendor Portal — Protected for vendor role */}
        <Route path="/vendor" element={<RoleGuard allowedRoles={["vendor", "admin"]} />}>
          <Route path="dashboard" element={<VendorDashboard />} />
        </Route>

        {/* Admin Portal — Protected for admin role */}
        <Route path="/admin" element={<RoleGuard allowedRoles={["admin"]} />}>
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        {/* ── Auth Pages ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>

      {showExpiredModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#111111] border border-[#E8E8E8] dark:border-white/5 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-luxury text-center space-y-6 transform translate-y-5">
            <div className="w-16 h-16 bg-[#C9A84C]/10 rounded-2xl flex items-center justify-center text-2xl text-[#C9A84C] mx-auto animate-pulse">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#111111] dark:text-white uppercase tracking-wider">Session Expired</h3>
              <p className="text-sm text-[#6B6B6B] dark:text-slate-400 font-medium">
                Your session has expired. Please log in again to continue accessing your account.
              </p>
            </div>
            <button
              onClick={() => {
                setShowExpiredModal(false);
                window.location.href = "/login";
              }}
              className="w-full py-3.5 bg-[#C9A84C] hover:bg-[#b8952e] text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-md shadow-[#C9A84C]/10"
            >
              Log In Again
            </button>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;