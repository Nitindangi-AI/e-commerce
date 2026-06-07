import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import OTPInput from '../../components/OTPInput';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { toast } from '../../store/useToastStore';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Enter ID, 2: Enter OTP, 3: Set Password
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Errors & timers
  const [errors, setErrors] = useState({});
  const [shakeDetails, setShakeDetails] = useState(false);
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

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrors({ identifier: 'Please enter your registered email' });
      setShakeDetails(true);
      setTimeout(() => setShakeDetails(false), 500);
      return;
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(identifier.trim())) {
      setErrors({ identifier: 'Please enter a valid email address' });
      setShakeDetails(true);
      setTimeout(() => setShakeDetails(false), 500);
      return;
    }
    setErrors({});
    setLoading(true);

    const emailVal = identifier.trim();

    try {
      const res = await authService.forgotSendOTP(emailVal);
      if (res.success) {
        toast.info(res.message || 'If an account exists, a code has been sent');
        setStep(2);
        setResendCooldown(60);
      } else {
        setErrors({ submit: res.message || 'Failed to send verification code. Please try again.' });
      }
    } catch (err) {
      setErrors({ submit: 'Something went wrong. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPCode = (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit verification code' });
      setShakeOtp(true);
      setTimeout(() => setShakeOtp(false), 500);
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!newPassword || newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeDetails(true);
      setTimeout(() => setShakeDetails(false), 500);
      return;
    }

    setErrors({});
    setLoading(true);

    const emailVal = identifier.trim();

    try {
      const res = await authService.forgotReset(emailVal, otp, newPassword);

      if (res.success) {
        toast.success('Password reset! Please log in.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // If the error points to OTP or something else
        if (res.message && (res.message.toLowerCase().includes('otp') || res.message.toLowerCase().includes('code'))) {
          toast.error(res.message);
          setStep(2); // take user back to verify code
          setErrors({ otp: res.message });
        } else {
          setErrors({ submit: res.message || 'Failed to reset password. Please check requirements.' });
        }
      }
    } catch (err) {
      setErrors({ submit: 'Failed to reset password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrors({});

    const emailVal = identifier.trim();

    try {
      const res = await authService.resendOTP(emailVal, 'forgot_password');
      if (res.success) {
        toast.success('Verification code resent successfully.');
        setResendCooldown(60);
      } else {
        setErrors({ otp: res.message || 'Failed to resend verification code.' });
      }
    } catch (err) {
      setErrors({ otp: 'Error resending verification code. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getMaskedIdentifier = () => {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      const parts = trimmed.split('@');
      const name = parts[0];
      const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : '***';
      return `${maskedName}@${parts[1]}`;
    }
    const cleanPhone = trimmed.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return `+91 ${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-2)}`;
    }
    return trimmed;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className={`max-w-md w-full space-y-8 bg-white border border-[#E8E8E8] rounded-3xl p-8 shadow-sm transition-all duration-300 ${shakeDetails || shakeOtp ? 'animate-shake' : ''}`}>
        
        {/* Back Link */}
        {step === 1 && (
          <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#C9A84C] transition-colors uppercase tracking-wider">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        )}

        {/* STEP 1: Enter Identifier */}
        {step === 1 && (
          <form onSubmit={handleSendResetCode} className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0A0A0A] font-display" style={{ fontFamily: "'Playfair Display', serif" }}>
                Forgot Password
              </h2>
              <p className="mt-2 text-sm text-gray-500 font-medium">
                Enter your registered email to receive a reset code
              </p>
            </div>

            {errors.submit && (
              <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 leading-relaxed">
                {errors.submit}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Registered Email Address
              </label>
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full px-4 py-3 bg-[#FAFAF8] border ${
                  errors.identifier ? 'border-red-500' : 'border-[#E8E8E8]'
                } rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all`}
                placeholder="name@example.com"
              />
              {errors.identifier && (
                <p className="text-red-500 text-xs mt-1 font-semibold">{errors.identifier}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#C9A84C] hover:bg-[#b8952e] text-white rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send Reset Code'
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0A0A0A] font-display" style={{ fontFamily: "'Playfair Display', serif" }}>
                Verify Reset Code
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                We sent a 6-digit code to <span className="font-bold text-[#0A0A0A]">{getMaskedIdentifier()}</span>
              </p>
            </div>

            {errors.otp && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl text-center leading-relaxed">
                {errors.otp}
              </div>
            )}

            <div className="py-4">
              <OTPInput
                length={6}
                onComplete={(val) => {
                  setOtp(val);
                  setStep(3);
                }}
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
                <button
                  type="button"
                  onClick={handleVerifyOTPCode}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-[#C9A84C] hover:bg-[#b8952e] text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300"
                >
                  Verify Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0A0A0A] font-display" style={{ fontFamily: "'Playfair Display', serif" }}>
                Reset Password
              </h2>
              <p className="mt-2 text-sm text-gray-500 font-medium">
                Set a strong password for your account
              </p>
            </div>

            {errors.submit && (
              <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 leading-relaxed">
                {errors.submit}
              </div>
            )}

            <div className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 bg-[#FAFAF8] border ${
                      errors.newPassword ? 'border-red-500' : 'border-[#E8E8E8]'
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
                <PasswordStrengthMeter password={newPassword} />
                {errors.newPassword && (
                  <p className="text-red-500 text-xs mt-1 font-semibold">{errors.newPassword}</p>
                )}
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
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 font-semibold">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 py-4 border border-[#E8E8E8] text-[#0A0A0A] hover:bg-gray-50 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 bg-[#C9A84C] hover:bg-[#b8952e] text-white rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        )}
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
