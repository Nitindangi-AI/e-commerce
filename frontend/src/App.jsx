import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { insforge } from "./lib/insforge";

import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalToast from "./components/GlobalToast";

// Lazy-loaded customer pages
const MainLayout = React.lazy(() => import("./layouts/MainLayout"));
const HomePage = React.lazy(() => import("./pages/Home/HomePage"));
const LoginPage = React.lazy(() => import("./pages/Auth/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/Auth/RegisterPage"));
const ShopPage = React.lazy(() => import("./pages/Shop/ShopPage"));
const CartPage = React.lazy(() => import("./pages/Cart/CartPage"));
const ProductDetails = React.lazy(() => import("./pages/Product/ProductDetails"));
const WishlistPage = React.lazy(() => import("./pages/Wishlist/WishlistPage"));
const SearchResultsPage = React.lazy(() => import("./pages/Search/SearchResultsPage"));
const CheckoutPage = React.lazy(() => import("./pages/Checkout/CheckoutPage"));
const OrderSuccessPage = React.lazy(() => import("./pages/Checkout/OrderSuccessPage"));
const AccountPage = React.lazy(() => import("./pages/Account/AccountPage"));
const OrderDetailPage = React.lazy(() => import("./pages/Account/OrderDetailPage"));
const StorefrontView = React.lazy(() => import("./pages/Shop/StorefrontView"));
const TrackingPage = React.lazy(() => import("./pages/Shop/TrackingPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Lazy-loaded portals & guards
import RoleGuard, { RequireAdmin, RequireVendor } from "./components/RoleGuard";
import GuestGuard from "./components/GuestGuard";
import AuthGuard from "./components/AuthGuard";
const VendorDashboard = React.lazy(() => import("./pages/Vendor/VendorDashboard"));
const AdminDashboard = React.lazy(() => import("./pages/Admin/AdminDashboard"));
const ForgotPasswordPage = React.lazy(() => import("./pages/Auth/ForgotPasswordPage"));
const VerifyEmailPage = React.lazy(() => import("./pages/Auth/VerifyEmailPage"));

function App() {
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    const handleLoad = () => {
      const rememberMe = localStorage.getItem("remember_me") === "true";
      const sessionActive = sessionStorage.getItem("session_active") === "true";
      if (!rememberMe && !sessionActive) {
        insforge.auth.signOut().catch(console.error);
      }
    };
    window.addEventListener("load", handleLoad);

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
    <ErrorBoundary>
      <Router>
        <GlobalToast />
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Customer Storefront ── */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="search" element={<SearchResultsPage />} />
              <Route path="product/slug/:slug" element={<ProductDetails />} />
              <Route path="track" element={<TrackingPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<AuthGuard><CheckoutPage /></AuthGuard>} />
              <Route path="order-success" element={<AuthGuard><OrderSuccessPage /></AuthGuard>} />
              <Route path="account" element={<AuthGuard><AccountPage /></AuthGuard>} />
              <Route path="orders/:id" element={<AuthGuard><OrderDetailPage /></AuthGuard>} />
              <Route path="wishlist" element={<AuthGuard><WishlistPage /></AuthGuard>} />
              <Route path="store/:vendorId" element={<StorefrontView />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Vendor Portal — Protected for vendor role */}
            <Route path="/vendor/*" element={<RequireVendor />}>
              <Route path="*" element={<VendorDashboard />} />
            </Route>

            {/* Admin Portal — Protected for admin role */}
            <Route path="/admin/*" element={<RequireAdmin />}>
              <Route path="*" element={<AdminDashboard />} />
            </Route>

            {/* ── Auth Pages (GuestGuard redirects logged-in users) ── */}
            <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
            <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />
            <Route path="/forgot-password" element={<GuestGuard><ForgotPasswordPage /></GuestGuard>} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </Suspense>

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
    </ErrorBoundary>
  );
}

export default App;