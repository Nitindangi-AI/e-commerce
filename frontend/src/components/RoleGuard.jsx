import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { insforge } from '../lib/insforge';
import Loader from './Loader';
import { toast } from './GlobalToast';
import { useAuthStore } from '../store/authStore';

export default function RoleGuard({ allowedRoles }) {
  const { user, isLoading, initialize } = useAuthStore();
  const [authorized, setAuthorized] = useState(false);
  const [redirectTo, setRedirectTo] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        await initialize();
        const activeUser = useAuthStore.getState().user;
        
        if (!activeUser) {
          if (active) {
            const wasActive = sessionStorage.getItem("session_active") === "true";
            const wasManual = sessionStorage.getItem("manual_logout") === "true";
            if (wasActive && !wasManual) {
              setAuthorized(true);
              setChecking(false);
            } else {
              setAuthorized(false);
              setRedirectTo("/login");
              setChecking(false);
            }
          }
          return;
        }

        const userRole = activeUser.role || 'customer';
        let isAuthorized = false;

        const normalizedUserRole = userRole === 'user' ? 'customer' : (userRole === 'merchant' ? 'vendor' : userRole);
        const normalizedAllowedRoles = allowedRoles.map(r => r === 'user' ? 'customer' : (r === 'merchant' ? 'vendor' : r));

        if (normalizedAllowedRoles.includes(normalizedUserRole)) {
          isAuthorized = true;
        } else if (normalizedAllowedRoles.includes('vendor') && normalizedUserRole === 'admin') {
          isAuthorized = true;
        } else if (normalizedAllowedRoles.includes('vendor')) {
          // Check if vendor profile exists (pending or rejected)
          const { data: vendorRecord } = await insforge.database
            .from('vendors')
            .select('status')
            .eq('user_id', activeUser.id)
            .maybeSingle();
          if (vendorRecord) {
            isAuthorized = true;
          }
        }

        if (active) {
          if (isAuthorized) {
            setAuthorized(true);
          } else {
            let errorMessage = "Access Denied: Unauthorized access.";
            if (allowedRoles.includes('admin')) {
              errorMessage = "Access Denied: You do not have Administrator permissions.";
            } else if (allowedRoles.includes('vendor') || allowedRoles.includes('merchant')) {
              errorMessage = "Access Denied: You do not have Merchant permissions.";
            }
            toast.error(errorMessage);
            setRedirectTo("/");
          }
          setChecking(false);
        }
      } catch (err) {
        console.error("RoleGuard Error:", err);
        if (active) {
          setAuthorized(false);
          setRedirectTo("/login");
          setChecking(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [allowedRoles, initialize]);

  if (isLoading || checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return authorized ? <Outlet context={{ user }} /> : <Navigate to="/login" replace />;
}

export function RequireAdmin() {
  return <RoleGuard allowedRoles={["admin"]} />;
}

export function RequireVendor() {
  return <RoleGuard allowedRoles={["vendor", "merchant", "admin"]} />;
}

