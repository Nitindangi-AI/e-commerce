import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PageLoader from './PageLoader';

export default function AuthGuard({ children }) {
  const { isLoggedIn, token, isLoading, initialize } = useAuthStore();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await initialize();
      setChecking(false);
    };
    checkAuth();
  }, [initialize]);

  if (checking || isLoading) {
    return <PageLoader />;
  }

  if (!isLoggedIn || !token) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return children;
}
