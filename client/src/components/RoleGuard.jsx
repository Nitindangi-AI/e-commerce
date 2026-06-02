import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { insforge } from '../lib/insforge';
import Loader from './Loader';

export default function RoleGuard({ allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const { data: authData } = await insforge.auth.getUser();
        if (!authData?.user) {
          if (active) {
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        // Fetch profile to verify role
        const { data: profile } = await insforge.database
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (active) {
          const userRole = profile?.role || 'customer';
          setUser({ ...authData.user, role: userRole });
          setAuthorized(allowedRoles.includes(userRole));
          setLoading(false);
        }
      } catch (err) {
        console.error("RoleGuard Error:", err);
        if (active) {
          setAuthorized(false);
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

  return authorized ? <Outlet context={{ user }} /> : <Navigate to="/login" replace />;
}
