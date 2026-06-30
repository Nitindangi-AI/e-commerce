import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/useToastStore';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);

  // Form inputs
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState('');
  const [shake, setShake] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Handle lockout countdown
  useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const validate = () => {
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Email address is required';
    } else {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(identifier.trim())) {
        newErrors.identifier = 'Please enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrorBanner('');
    setShake(false);

    const emailVal = identifier.trim();

    try {
      const res = await authService.login(emailVal, password);

      if (res.success) {
        // Fetch profile to make sure we have the latest user details
        const profileRes = await authService.getProfile();
        const user = profileRes.success ? profileRes.profile : res.user;

        setUser(user, res.token);
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('remember_me');
        }

        toast.success(`Welcome back, ${user.full_name || user.email || 'User'}!`);

        // Check redirect route based on location.state.from or fallback to /
        const from = location.state?.from || '/';
        setTimeout(() => {
          navigate(from);
        }, 1000);
      } else {
        triggerFailure(res);
      }
    } catch (err) {
      triggerFailure({ message: 'Login failed. Please check your credentials and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const triggerFailure = (res) => {
    setShake(true);
    setTimeout(() => setShake(false), 500);

    // If account locked (HTTP 423 / message contains "locked" or "Try again")
    if (res.message && (res.message.includes('locked') || res.message.includes('Try again'))) {
      const match = res.message.match(/(\d+)\s+minutes?/);
      const minutes = match ? parseInt(match[1], 10) : 30;
      setLockoutSeconds(minutes * 60);
      setErrorBanner(`Account locked. Try again in ${minutes} minutes.`);
    } else {
      setErrorBanner(res.message || 'Invalid email or password.');
    }
  };

  const formatLockoutTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A] flex font-sans">
      
      {/* LEFT PANEL: BRAND VISUAL (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A0A0A] text-white flex-col justify-between p-16 relative overflow-hidden">
        {/* Subtle decorative grid/lights */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#C9A84C]/10 blur-[140px] pointer-events-none" />
        
        <div>
          <Link to="/" className="text-2xl font-bold tracking-[0.2em] uppercase text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Trendz
          </Link>
        </div>

        <div className="max-w-md space-y-6 z-10">
          <span className="text-xs font-bold tracking-widest uppercase text-[#C9A84C] border-b border-[#C9A84C]/30 pb-2 inline-block">
            Premium Experience
          </span>
          <h1 className="text-5xl font-bold leading-tight font-display text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Step Into a World of <span className="italic text-[#C9A84C]">Refined Elegance</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Log in to manage your collections, track premium orders, and access exclusive member-only privileges.
          </p>
        </div>

        <div className="text-gray-500 text-xs font-medium z-10">
          &copy; 2026 Trendz Storefront. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL: FORM (Full height) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 lg:px-20 relative">
        <div className="lg:hidden absolute top-8 left-8">
          <Link to="/" className="text-xl font-bold tracking-[0.2em] uppercase text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Trendz
          </Link>
        </div>

        <div className={`max-w-md w-full space-y-8 bg-white border border-[#E8E8E8] rounded-3xl p-8 shadow-sm transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#0A0A0A] font-display" style={{ fontFamily: "'Playfair Display', serif" }}>
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">
              Please enter your details to sign in
            </p>
          </div>

          {/* Red Error Banner at the top of Card */}
          {errorBanner && (
            <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 flex flex-col items-center gap-1">
              <span>{errorBanner}</span>
              {lockoutSeconds > 0 && (
                <span className="font-mono text-sm font-extrabold text-red-800">
                  Time remaining: {formatLockoutTime(lockoutSeconds)}
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Email Address
                </label>
              </div>
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full px-4 py-3 bg-[#FAFAF8] border ${
                  errors.identifier ? 'border-red-500' : 'border-[#E8E8E8]'
                } rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all`}
                placeholder="name@example.com"
                disabled={lockoutSeconds > 0}
              />
              {errors.identifier && (
                <p className="text-red-500 text-xs mt-1 font-semibold">{errors.identifier}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-4 pr-12 py-3 bg-[#FAFAF8] border ${
                    errors.password ? 'border-red-500' : 'border-[#E8E8E8]'
                  } rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all`}
                  placeholder="••••••••"
                  disabled={lockoutSeconds > 0}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#C9A84C] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 font-semibold">{errors.password}</p>
              )}
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#C9A84C] border-gray-300 rounded focus:ring-[#C9A84C] accent-[#C9A84C]"
                />
                <span className="ml-2 text-xs font-medium text-gray-500 select-none">
                  Remember Me
                </span>
              </label>

              <Link
                to="/forgot-password"
                className="text-xs font-bold text-[#C9A84C] hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="w-full py-4 bg-[#C9A84C] hover:bg-[#b8952e] disabled:bg-[#C9A84C]/50 text-white rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-[#C9A84C]/10"
            >
              {loading ? (
                <div className="skeleton h-4 w-20 rounded !bg-white/30" />
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Social Sign In */}
          <div className="space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E8E8]" />
              </div>
              <span className="relative px-4 text-xs font-bold tracking-wider text-gray-400 uppercase bg-white select-none">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={async () => {
                const res = await authService.loginWithGoogle();
                if (!res.success) toast.error(res.message);
              }}
              className="w-full py-3.5 bg-white border border-[#E8E8E8] hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.56 5.56 0 0 1 8.4 12.96a5.56 5.56 0 0 1 5.59-5.557c1.496 0 2.864.542 3.924 1.436l3.14-3.14A9.87 9.87 0 0 0 13.99 3c-5.523 0-10 4.477-10 10s4.477 10 10 10c5.8 0 9.645-4.077 9.645-9.814 0-.66-.06-1.29-.175-1.9H12.24Z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-sm font-medium text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#C9A84C] hover:underline font-bold">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}