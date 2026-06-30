import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { insforge } from '../../lib/insforge';
import OTPInput from '../../components/OTPInput';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { toast } from '../../store/useToastStore';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const [step, setStep] = useState(1); // 1: Details, 2: OTP, 3: Success
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agree, setAgree] = useState(false);

  // Step 1 Validation Errors
  const [errors, setErrors] = useState({});
  const [shakeDetails, setShakeDetails] = useState(false);

  // OTP Step State
  const [otpError, setOtpError] = useState('');
  const [shakeOtp, setShakeOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateDetails = () => {
    const newErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters';
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit Indian phone number';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agree) {
      newErrors.agree = 'You must agree to the Terms and Privacy Policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!validateDetails()) {
      setShakeDetails(true);
      setTimeout(() => setShakeDetails(false), 500);
      return;
    }

    setLoading(true);

    try {
      const res = await authService.signUp({
        email,
        password,
        name: fullName,
        phone
      });
      if (res.success) {
        if (res.requireEmailVerification === false) {
          // Log in and auto-login
          const loginRes = await authService.login(email, password);
          if (loginRes.success) {
            setUser(loginRes.user, loginRes.token);
            // Update profile name
            if (loginRes.user?.id) {
              await insforge.database
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', loginRes.user.id);
            }
            toast.success('Account created successfully!');
            setStep(3);
          } else {
            setErrors({ submit: loginRes.message || 'Signup succeeded but login failed.' });
          }
        } else {
          toast.success(res.message || 'Verification code sent to your email.');
          setStep(2);
          setResendCooldown(60);
        }
      } else {
        // Handle existing account error message specifically
        if (res.message && (res.message.toLowerCase().includes('already exists') || res.message.toLowerCase().includes('duplicate') || res.message.toLowerCase().includes('registered'))) {
          setErrors({
            submit: (
              <span>
                An account with this email already exists.{' '}
                <Link to="/login" className="text-[#C9A84C] hover:underline font-bold">
                  Log in instead?
                </Link>
              </span>
            )
          });
        } else {
          setErrors({ submit: res.message || 'Failed to send verification code. Please try again.' });
        }
      }
    } catch (err) {
      setErrors({ submit: 'Something went wrong. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue) => {
    setLoading(true);
    setOtpError('');
    setShakeOtp(false);

    try {
      const res = await authService.verifyEmail({
        email,
        otp: otpValue,
        name: fullName,
        phone
      });

      if (res.success) {
        // Set Auth State
        setUser(res.user, res.token);
        toast.success('Account created successfully!');
        setStep(3);
      } else {
        setShakeOtp(true);
        setOtpError(res.message || 'Invalid verification code');
        setTimeout(() => setShakeOtp(false), 500);
      }
    } catch (err) {
      setShakeOtp(true);
      setOtpError('Failed to verify verification code. Please try again.');
      setTimeout(() => setShakeOtp(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setOtpError('');

    try {
      const res = await authService.resendOTP(email, 'register');
      if (res.success) {
        toast.success('Verification code resent successfully.');
        setResendCooldown(60);
      } else {
        setOtpError(res.message || 'Failed to resend verification code.');
      }
    } catch (err) {
      setOtpError('Error resending verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mask middle digits of phone number e.g. +91 XXXXXXXX
  const getMaskedPhone = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      return `+91 ${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-2)}`;
    }
    return `+91 ${cleanPhone}`;
  };

  const firstName = fullName.trim().split(/\s+/)[0] || '';

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className={`max-w-md w-full space-y-8 bg-white border border-[#E8E8E8] rounded-3xl p-8 shadow-sm transition-all duration-300 ${shakeDetails || shakeOtp ? 'animate-shake' : ''}`}>
        
        {/* Stepper Header (steps 1 & 2) */}
        {step < 3 && (
          <div className="flex items-center justify-between pb-6 border-b border-[#E8E8E8]">
            <div className="flex items-center space-x-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1 ? 'bg-[#C9A84C] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                1
              </span>
              <span className={`text-xs font-bold tracking-wider uppercase ${
                step === 1 ? 'text-[#C9A84C]' : 'text-gray-400'
              }`}>
                Details
              </span>
            </div>
            <div className="w-12 h-[2px] bg-gray-200" />
            <div className="flex items-center space-x-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 2 ? 'bg-[#C9A84C] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </span>
              <span className={`text-xs font-bold tracking-wider uppercase ${
                step === 2 ? 'text-[#C9A84C]' : 'text-gray-400'
              }`}>
                Verification
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: Enter Details */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0A0A0A] font-display" style={{ fontFamily: "'Playfair Display', serif" }}>
                Create Your Account
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Join Trendy to experience premium shopping
              </p>
            </div>

            {errors.submit && (
              <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 leading-relaxed">
                {errors.submit}
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#FAFAF8] border ${
                    errors.fullName ? 'border-red-500' : 'border-[#E8E8E8]'
                  } rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fullName}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#FAFAF8] border ${
                    errors.email ? 'border-red-500' : 'border-[#E8E8E8]'
                  } rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all`}
                  placeholder="name@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</p>}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`w-full pl-12 pr-4 py-3 bg-[#FAFAF8] border ${
                      errors.phone ? 'border-red-500' : 'border-[#E8E8E8]'
                    } rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all`}
                    placeholder="98765 43210"
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.phone}</p>}
              </div>

              {/* Password */}
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
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#C9A84C] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
                {errors.password && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 bg-[#FAFAF8] border ${
                      errors.confirmPassword ? 'border-red-500' : 'border-[#E8E8E8]'
                    } rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#C9A84C] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.confirmPassword}</p>}
              </div>

              {/* Referral Code (optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full px-4 py-2 bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] transition-all"
                  placeholder="Enter referral code"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start mt-2">
                <input
                  id="agree-checkbox"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-[#C9A84C] border-gray-300 rounded focus:ring-[#C9A84C] accent-[#C9A84C]"
                />
                <label htmlFor="agree-checkbox" className="ml-2 text-xs font-medium text-gray-500 leading-relaxed">
                  I agree to the Terms of Service and Privacy Policy
                </label>
              </div>
              {errors.agree && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.agree}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#C9A84C] hover:bg-[#b8952e] text-white rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="skeleton h-4 w-20 rounded !bg-white/30" />
              ) : (
                'Send Verification Code'
              )}
            </button>

            {/* Social Sign In */}
            <div className="space-y-6 mt-6">
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
              Already have an account?{' '}
              <Link to="/login" className="text-[#C9A84C] hover:underline font-bold">
                Log in
              </Link>
            </p>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0A0A0A] font-display" style={{ fontFamily: "'Playfair Display', serif" }}>
                Verify Email
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                We sent a 6-digit code to <span className="font-bold text-[#0A0A0A]">{email}</span>
              </p>
            </div>

            {otpError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl text-center leading-relaxed">
                {otpError}
              </div>
            )}

            <div className="py-4">
              <OTPInput
                length={6}
                onComplete={handleVerifyOTP}
                disabled={loading}
                shake={shakeOtp}
              />
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
                className="text-xs font-bold tracking-wider uppercase text-[#C9A84C] disabled:text-gray-400 transition-colors"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-3.5 border border-[#E8E8E8] text-[#0A0A0A] hover:bg-gray-50 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="text-center py-6 space-y-6 animate-fade-in">
            {/* Animated Gold Checkmark */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full flex items-center justify-center text-4xl text-[#C9A84C] relative overflow-hidden animate-checkmark">
                <svg
                  className="w-10 h-10 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#0A0A0A] font-display" style={{ fontFamily: "'Playfair Display', serif" }}>
                Welcome to Trendy, {firstName}! 🎉
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Your account is ready
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-[#C9A84C] hover:bg-[#b8952e] text-white rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-md"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-checkmark {
          animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
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