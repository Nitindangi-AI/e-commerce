import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import PageLoader from './PageLoader';

export default function GuestGuard({ children }) {
  const { isLoggedIn, token, isLoading, initialize } = useAuthStore();
  const [searchParams] = useSearchParams();
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

  if (isLoggedIn && token) {
    const redirectTo = searchParams.get('redirect') || '/';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
