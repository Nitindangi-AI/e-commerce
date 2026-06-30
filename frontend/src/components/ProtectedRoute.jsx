import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PageLoader from './PageLoader';

export default function ProtectedRoute({ children }) {
  const { user, isLoading, initialize } = useAuthStore();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        await initialize();
      }
      setChecking(false);
    };
    checkAuth();
  }, [initialize, user]);

  if (checking || isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet context={{ user }} />;
}
