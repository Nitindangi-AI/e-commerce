import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { insforge } from '../lib/insforge';
import Loader from './Loader';
import toast from 'react-hot-toast';

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

        // Fetch profile and vendor record in parallel
        const [profileRes, vendorRes] = await Promise.all([
          insforge.database
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .maybeSingle(),
          insforge.database
            .from('vendors')
            .select('status')
            .eq('user_id', authData.user.id)
            .maybeSingle()
        ]);

        const profile = profileRes.data;
        const vendor = vendorRes.data;

        if (active) {
          const userRole = profile?.role || 'user';
          setUser({ ...authData.user, role: userRole });

          const needsAdmin = allowedRoles.includes('admin');
          const needsVendor = allowedRoles.includes('vendor') || allowedRoles.includes('merchant');

          if (needsAdmin) {
            if (userRole === 'admin') {
              setAuthorized(true);
            } else {
              toast.error("Access Denied: You do not have Administrator permissions.");
              setRedirectTo("/");
            }
          } else if (needsVendor) {
            if (vendor) {
              setAuthorized(true);
            } else {
              toast.error("Access Denied: You do not have Merchant permissions.");
              setRedirectTo("/");
            }
          } else {
            // General role checking
            let isAuth = allowedRoles.includes(userRole);
            if (!isAuth) {
              if (allowedRoles.includes('customer') && userRole === 'user') isAuth = true;
              if (allowedRoles.includes('user') && userRole === 'customer') isAuth = true;
            }
            if (isAuth) {
              setAuthorized(true);
            } else {
              toast.error("Access Denied: Unauthorized access.");
              setRedirectTo("/");
            }
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
