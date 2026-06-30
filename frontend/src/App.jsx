
import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { insforge } from "./lib/insforge";
import { useAuthStore } from "./store/authStore";

import PageSkeleton from "./components/PageSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalToast from "./components/GlobalToast";

// Lazy-loaded customer pages
const MainLayout = lazy(() => import("./layouts/MainLayout"));
const HomePage = lazy(() => import("./pages/Home/HomePage"));
const LoginPage = lazy(() => import("./pages/Auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/Auth/RegisterPage"));
const ShopPage = lazy(() => import("./pages/Shop/ShopPage"));
const CartPage = lazy(() => import("./pages/Cart/CartPage"));
const ProductDetails = lazy(() => import("./pages/Product/ProductDetails"));
const WishlistPage = lazy(() => import("./pages/Wishlist/WishlistPage"));
const SearchResultsPage = lazy(() => import("./pages/Search/SearchResultsPage"));
const CheckoutPage = lazy(() => import("./pages/Checkout/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("./pages/Checkout/OrderSuccessPage"));
const AccountPage = lazy(() => import("./pages/Account/AccountPage"));
const OrderDetailPage = lazy(() => import("./pages/Account/OrderDetailPage"));
const StorefrontView = lazy(() => import("./pages/Shop/StorefrontView"));
const TrackingPage = lazy(() => import("./pages/Shop/TrackingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy-loaded portals & guards
import RoleGuard, { RequireAdmin, RequireVendor } from "./components/RoleGuard";
import GuestGuard from "./components/GuestGuard";
import ProtectedRoute from "./components/ProtectedRoute";
import SellerRoute from "./components/SellerRoute";
const VendorDashboard = lazy(() => import("./pages/Vendor/VendorDashboard"));
const AdminDashboard = lazy(() => import("./pages/Admin/AdminDashboard"));
const ForgotPasswordPage = lazy(() => import("./pages/Auth/ForgotPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/Auth/VerifyEmailPage"));
const VendorRegisterPage = lazy(() => import("./pages/Auth/VendorRegisterPage"));

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

    const { data: { subscription } } = insforge.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        sessionStorage.setItem("session_active", "true");
        sessionStorage.removeItem("manual_logout");
        const currentStoreUser = useAuthStore.getState().user;
        if (!currentStoreUser || currentStoreUser.id !== session.user.id) {
          const token = insforge.getHttpClient().getHeaders().Authorization?.split(' ')[1] || null;
          try {
            const profileRes = await insforge.auth.getProfile(session.user.id);
            const activeProfile = profileRes.data || session.user;
            useAuthStore.getState().setUser(activeProfile, token);
          } catch (e) {
            useAuthStore.getState().setUser(session.user, token);
          }
        }
      } else {
        const wasActive = sessionStorage.getItem("session_active") === "true";
        const wasManual = sessionStorage.getItem("manual_logout") === "true";
        if (wasActive && !wasManual) {
          setShowExpiredModal(true);
        }
        sessionStorage.removeItem("session_active");
        if (useAuthStore.getState().user) {
          useAuthStore.getState().setUser(null, null);
        }
      }
    });

    return () => {
      window.removeEventListener("load", handleLoad);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
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
          <Routes>
            {/* ── Customer Storefront ── */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="search" element={<SearchResultsPage />} />
              <Route path="product/slug/:slug" element={<ProductDetails />} />
              <Route path="track" element={<TrackingPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
              <Route path="account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
              <Route path="store/:vendorId" element={<StorefrontView />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Seller Portal — Protected for seller role */}
            <Route path="/seller/*" element={<SellerRoute />}>
              <Route path="*" element={<VendorDashboard />} />
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
            <Route path="/vendor-register" element={<GuestGuard><VendorRegisterPage /></GuestGuard>} />
            <Route path="/forgot-password" element={<GuestGuard><ForgotPasswordPage /></GuestGuard>} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
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
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;