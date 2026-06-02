import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

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
  return (
    <Router>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(212,175,55,0.3)',
            fontSize: '14px',
          },
          iconTheme: {
            primary: '#d4af37',
            secondary: '#000',
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
    </Router>
  );
}

export default App;