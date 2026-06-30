import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Upload, FileText, CheckCircle, Info } from 'lucide-react';

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [panCard, setPanCard] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  
  // Logo upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({});

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    setUploadError('');
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size exceeds 2MB limit.');
      return;
    }

    // Validate mime-type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only JPG, PNG, and WEBP formats are allowed.');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!storeName.trim()) newErrors.storeName = 'Store name is required';
    if (!storeDescription.trim()) newErrors.storeDescription = 'Store description is required';
    if (!businessAddress.trim()) newErrors.businessAddress = 'Business address is required';

    // PAN validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panCard.trim() || !panRegex.test(panCard.toUpperCase())) {
      newErrors.panCard = 'Invalid PAN number format (Expected: ABCDE1234F)';
    }

    // GSTIN validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstNumber.trim() || !gstRegex.test(gstNumber.toUpperCase())) {
      newErrors.gstNumber = 'Invalid GSTIN format (Expected: 15-digit code, e.g., 27AAAAA1111A1Z1)';
    }

    // Aadhaar validation
    const aadharClean = aadharNumber.replace(/\s/g, '');
    const aadharRegex = /^[2-9]{1}[0-9]{11}$/;
    if (!aadharClean || !aadharRegex.test(aadharClean)) {
      newErrors.aadharNumber = 'Invalid Aadhaar number (Expected: 12 digits, starts with 2-9)';
    }

    // Bank Account Number validation
    const bankRegex = /^[0-9]{9,18}$/;
    if (!bankAccount.trim() || !bankRegex.test(bankAccount)) {
      newErrors.bankAccount = 'Invalid Bank Account Number (Expected: 9-18 digits)';
    }

    // IFSC validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscCode.trim() || !ifscRegex.test(ifscCode.toUpperCase())) {
      newErrors.ifscCode = 'Invalid IFSC code format (Expected: 11 characters, 5th character is 0)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        firstName,
        lastName,
        email,
        password,
        phone,
        role: 'vendor',
        storeName,
        storeDescription,
        businessAddress,
        storeLogoFile: logoFile,
        panCard: panCard.toUpperCase(),
        gstNumber: gstNumber.toUpperCase(),
        bankAccount,
        aadharNumber: aadharNumber.replace(/\s/g, ''),
        ifscCode: ifscCode.toUpperCase()
      });

      setSuccess(true);
      toast.success('Registration successful!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center py-20 px-6 font-sans">
        <div className="max-w-md w-full bg-white/[0.02] border border-white/5 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto border border-[#C9A84C]/20 text-[#C9A84C]">
            <CheckCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-black text-white uppercase tracking-wider">Application Received</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Thank you for applying to become a seller! Your application is currently under review by our administration.
            </p>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-white/40 leading-relaxed">
            Registered Email: <span className="text-white">{email}</span><br />
            Business Name: <span className="text-white">{storeName}</span>
          </div>
          <Link
            to="/login"
            className="btn-gold block w-full py-3.5 text-center text-xs font-bold tracking-widest uppercase rounded-xl transition-all duration-300"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center py-20 px-6 font-sans">
      <div className="max-w-2xl w-full bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="font-display text-3xl font-black text-white uppercase tracking-widest">Become a Seller</h2>
          <p className="text-white/40 text-xs tracking-widest uppercase">Trendy Marketplace Onboarding</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Step 1: Personal Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider border-b border-white/5 pb-2">1. Personal Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.firstName ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="John"
                  required
                />
                {errors.firstName && <p className="text-red-400 text-[10px] mt-1">{errors.firstName}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.lastName ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="Doe"
                  required
                />
                {errors.lastName && <p className="text-red-400 text-[10px] mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.email ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="john@example.com"
                  required
                />
                {errors.email && <p className="text-red-400 text-[10px] mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.phone ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="9876543210"
                  required
                />
                {errors.phone && <p className="text-red-400 text-[10px] mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.password ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-[10px] mt-1">{errors.password}</p>}
            </div>
          </div>

          {/* Step 2: Store Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider border-b border-white/5 pb-2">2. Store Setup</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Store Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.storeName ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="Aurelian Luxe"
                  required
                />
                {errors.storeName && <p className="text-red-400 text-[10px] mt-1">{errors.storeName}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Store Description</label>
                <input
                  type="text"
                  value={storeDescription}
                  onChange={e => setStoreDescription(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.storeDescription ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="Premium handcrafted timepieces and leather accessories"
                  required
                />
                {errors.storeDescription && <p className="text-red-400 text-[10px] mt-1">{errors.storeDescription}</p>}
              </div>
            </div>

            {/* Business Address */}
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Registered Business Address</label>
              <textarea
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                rows={2}
                className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.businessAddress ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C] resize-none`}
                placeholder="123, MG Road, Andheri West, Mumbai, Maharashtra – 400058"
                required
              />
              {errors.businessAddress && <p className="text-red-400 text-[10px] mt-1">{errors.businessAddress}</p>}
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Store Logo</label>
              <div className="flex flex-col md:flex-row gap-4 items-center p-5 bg-white/[0.01] border border-white/5 rounded-2xl">
                
                {/* Logo Preview */}
                <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={20} className="text-white/20" />
                  )}
                </div>

                <div className="flex-grow w-full space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="logo-input"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-input"
                    className="btn-gold inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase cursor-pointer text-white border border-[#C9A84C]/50 hover:bg-[#C9A84C]/10 transition-all"
                  >
                    <Upload size={12} /> Choose Image
                  </label>
                  <p className="text-[10px] text-white/30">JPG, PNG, or WEBP. Max size 2MB.</p>
                </div>
              </div>
              {uploadError && <p className="text-red-400 text-[10px] mt-1">{uploadError}</p>}
            </div>
          </div>

          {/* Step 3: Legal & Financial Verification */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider border-b border-white/5 pb-2">3. Legal & Financial Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">PAN Card Number</label>
                <input
                  type="text"
                  value={panCard}
                  onChange={e => setPanCard(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.panCard ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  required
                />
                {errors.panCard && <p className="text-red-400 text-[10px] mt-1">{errors.panCard}</p>}
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">GSTIN</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={e => setGstNumber(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.gstNumber ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="27AAAAA1111A1Z1"
                  maxLength={15}
                  required
                />
                {errors.gstNumber && <p className="text-red-400 text-[10px] mt-1">{errors.gstNumber}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Aadhaar Number</label>
                <input
                  type="text"
                  value={aadharNumber}
                  onChange={e => setAadharNumber(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.aadharNumber ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="1234 5678 9012"
                  maxLength={14}
                  required
                />
                {errors.aadharNumber && <p className="text-red-400 text-[10px] mt-1">{errors.aadharNumber}</p>}
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Bank Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                  className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.bankAccount ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                  placeholder="123456789012"
                  maxLength={18}
                  required
                />
                {errors.bankAccount && <p className="text-red-400 text-[10px] mt-1">{errors.bankAccount}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">IFSC Code</label>
              <input
                type="text"
                value={ifscCode}
                onChange={e => setIfscCode(e.target.value)}
                className={`input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${errors.ifscCode ? 'border-red-500/50' : 'border-white/5'} focus:outline-none focus:border-[#C9A84C]`}
                placeholder="HDFC0001234"
                maxLength={11}
                required
              />
              {errors.ifscCode && <p className="text-red-400 text-[10px] mt-1">{errors.ifscCode}</p>}
            </div>
          </div>

          {/* Guidelines info */}
          <div className="flex gap-3 p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-[10px] text-white/30 leading-relaxed font-semibold">
            <Info size={18} className="text-[#C9A84C] flex-shrink-0" />
            <p>
              By applying, you agree to comply with our platform merchant commission structure (10% standard transaction fee) and verify that all business details match your legal documents. Application processing takes 2-3 business days.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-4 text-xs font-bold tracking-widest uppercase rounded-xl transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Submitting Application...' : 'Submit Application'}
          </button>
        </form>

        {/* Footer links */}
        <div className="text-center text-xs text-white/40">
          Already have an account?{' '}
          <Link to="/login" className="text-[#C9A84C] hover:underline font-bold">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
