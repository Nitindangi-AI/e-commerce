import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { insforge } from '../lib/insforge';
import Loader from './Loader';
import { toast } from './GlobalToast';

export default function RoleGuard({ allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);
  const [redirectTo, setRedirectTo] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const { data: authData } = await insforge.auth.getUser();
        if (!authData?.user) {
          if (active) {
            const wasActive = sessionStorage.getItem("session_active") === "true";
            const wasManual = sessionStorage.getItem("manual_logout") === "true";
            if (wasActive && !wasManual) {
              setAuthorized(true);
              setLoading(false);
            } else {
              setAuthorized(false);
              setRedirectTo("/login");
              setLoading(false);
            }
          }
          return;
        }

        // Fetch profile from InsForge profiles table
        const { data: profile, error: profileError } = await insforge.database
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile Fetch Error:", profileError.message);
        }

        if (active) {
          const userRole = profile?.role || 'customer';
          setUser({ ...authData.user, role: userRole });

          let isAuthorized = false;

          const normalizedUserRole = userRole === 'user' ? 'customer' : (userRole === 'merchant' ? 'vendor' : userRole);
          const normalizedAllowedRoles = allowedRoles.map(r => r === 'user' ? 'customer' : (r === 'merchant' ? 'vendor' : r));

          if (normalizedAllowedRoles.includes(normalizedUserRole)) {
            isAuthorized = true;
          } else if (normalizedAllowedRoles.includes('vendor') && normalizedUserRole === 'admin') {
            isAuthorized = true;
          }

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
          setLoading(false);
        }
      } catch (err) {
        console.error("RoleGuard Error:", err);
        if (active) {
          setAuthorized(false);
          setRedirectTo("/login");
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [allowedRoles]);

  if (loading) {
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

