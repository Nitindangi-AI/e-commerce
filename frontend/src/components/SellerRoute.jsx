import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ProtectedRoute from './ProtectedRoute';

export default function SellerRoute({ children }) {
  const { user } = useAuthStore();

  return (
    <ProtectedRoute>
      {user?.role === 'seller' || user?.role === 'vendor' ? (
        children ? children : <Outlet context={{ user }} />
      ) : (
        <Navigate to="/" replace />
      )}
    </ProtectedRoute>
  );
}
