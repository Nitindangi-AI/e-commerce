import { useState } from 'react';
import { X, Upload, Store, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// ── Validation helpers (mirrors backend) ─────────────────────────────────────
const PAN_RE     = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GST_RE     = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const AADHAAR_RE = /^[2-9][0-9]{11}$/;
const IFSC_RE    = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_RE    = /^[0-9]{9,18}$/;

function validateFields(f) {
  const e = {};
  if (!f.storeName.trim())        e.storeName        = 'Store name is required';
  if (!f.storeDescription.trim()) e.storeDescription = 'Store description is required';
  if (!f.businessAddress.trim())  e.businessAddress  = 'Business address is required';
  if (!PAN_RE.test(f.panCard.toUpperCase()))
    e.panCard = 'Invalid PAN (Expected: ABCDE1234F)';
  if (!GST_RE.test(f.gstNumber.toUpperCase()))
    e.gstNumber = 'Invalid GSTIN (Expected: 15-char, e.g. 27AAAAA1111A1Z1)';
  if (!AADHAAR_RE.test(f.aadharNumber.replace(/\s/g, '')))
    e.aadharNumber = 'Invalid Aadhaar (12 digits, starts with 2-9)';
  if (!BANK_RE.test(f.bankAccount))
    e.bankAccount = 'Invalid bank account (9-18 digits)';
  if (!IFSC_RE.test(f.ifscCode.toUpperCase()))
    e.ifscCode = 'Invalid IFSC (11 chars, 5th is 0, e.g. HDFC0001234)';
  return e;
}

const INITIAL = {
  storeName: '', storeDescription: '', businessAddress: '',
  panCard: '', gstNumber: '', aadharNumber: '',
  bankAccount: '', ifscCode: '',
};

/**
 * VendorApplyModal
 * ─────────────────
 * Shown from AccountPage when a customer clicks "Become a Seller".
 * Submits to POST /api/vendor/upgrade (the existing endpoint that handles
 * both new applications and re-applications after rejection).
 *
 * Props:
 *   onClose()  — called to dismiss the modal
 *   onSuccess() — called after successful submission (e.g. reload user)
 */
export default function VendorApplyModal({ onClose, onSuccess }) {
  const [fields, setFields] = useState(INITIAL);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    setLogoError('');
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setLogoError('Max 2MB allowed'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setLogoError('Only JPG, PNG, WEBP allowed'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateFields(fields);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields');
      return;
    }
    setLoading(true);
    try {
      await authAPI.applyForVendor({
        storeName:        fields.storeName,
        storeDescription: fields.storeDescription,
        businessAddress:  fields.businessAddress,
        storeLogoFile:    logoFile,
        panCard:          fields.panCard.toUpperCase(),
        gstNumber:        fields.gstNumber.toUpperCase(),
        bankAccount:      fields.bankAccount,
        aadharNumber:     fields.aadharNumber.replace(/\s/g, ''),
        ifscCode:         fields.ifscCode.toUpperCase(),
      });
      setSubmitted(true);
      toast.success("Application submitted! We'll review within 2-3 business days.");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (key) =>
    `input-field w-full px-4 py-3 rounded-xl text-xs text-white bg-white/[0.03] border ${
      errors[key] ? 'border-red-500/50' : 'border-white/5'
    } focus:outline-none focus:border-[#C9A84C] transition-colors`;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-[#0D0D0D] border border-white/8 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0D0D0D]/95 backdrop-blur-sm flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">
              <Store size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-black text-white uppercase tracking-wider">Become a Seller</h2>
              <p className="text-[10px] text-white/40 tracking-widest uppercase">Trendy Marketplace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto border border-[#C9A84C]/20 text-[#C9A84C]">
              <CheckCircle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-black text-white uppercase tracking-wider">Application Received</h3>
              <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
                Your seller application is under review. You'll receive a notification once it's processed (2–3 business days).
              </p>
            </div>
            <button onClick={onClose} className="btn-gold py-3 px-8 rounded-xl text-xs font-bold tracking-widest uppercase">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-7">

            {/* Info banner */}
            <div className="flex gap-3 p-4 bg-[#C9A84C]/5 border border-[#C9A84C]/15 rounded-2xl">
              <Info size={16} className="text-[#C9A84C] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/50 leading-relaxed">
                Your existing orders and cart will be preserved. Once approved, you'll be upgraded to vendor status and can list products from the Vendor Dashboard.
              </p>
            </div>

            {/* ── Section 1: Store Details ── */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-wider border-b border-white/5 pb-2">
                1 · Store Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Store Name *</label>
                  <input id="va-storeName" type="text" value={fields.storeName} onChange={set('storeName')}
                    className={fieldClass('storeName')} placeholder="Aurelian Luxe" />
                  {errors.storeName && <p className="text-red-400 text-[10px] mt-1">{errors.storeName}</p>}
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Store Description *</label>
                  <input id="va-storeDesc" type="text" value={fields.storeDescription} onChange={set('storeDescription')}
                    className={fieldClass('storeDescription')} placeholder="Luxury accessories curated for you" />
                  {errors.storeDescription && <p className="text-red-400 text-[10px] mt-1">{errors.storeDescription}</p>}
                </div>
              </div>

              {/* Business Address */}
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Registered Business Address *</label>
                <textarea
                  id="va-businessAddress"
                  value={fields.businessAddress}
                  onChange={set('businessAddress')}
                  rows={2}
                  className={`${fieldClass('businessAddress')} resize-none`}
                  placeholder="123, MG Road, Andheri West, Mumbai, Maharashtra – 400058"
                />
                {errors.businessAddress && <p className="text-red-400 text-[10px] mt-1">{errors.businessAddress}</p>}
              </div>

              {/* Logo upload */}
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Store Logo</label>
                <div className="flex items-center gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                  <div className="w-14 h-14 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                      : <Upload size={18} className="text-white/20" />}
                  </div>
                  <div className="space-y-1">
                    <input type="file" accept="image/*" id="va-logo" onChange={handleLogo} className="hidden" />
                    <label htmlFor="va-logo"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase cursor-pointer border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all">
                      <Upload size={11} /> {logoFile ? 'Change Image' : 'Choose Image'}
                    </label>
                    <p className="text-[10px] text-white/25">JPG, PNG, WEBP · Max 2MB</p>
                    {logoError && <p className="text-red-400 text-[10px]">{logoError}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: Legal & Financial ── */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-wider border-b border-white/5 pb-2">
                2 · Legal &amp; Financial Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">PAN Card *</label>
                  <input id="va-pan" type="text" value={fields.panCard} onChange={set('panCard')}
                    maxLength={10} className={fieldClass('panCard')} placeholder="ABCDE1234F" />
                  {errors.panCard && <p className="text-red-400 text-[10px] mt-1">{errors.panCard}</p>}
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">GSTIN *</label>
                  <input id="va-gst" type="text" value={fields.gstNumber} onChange={set('gstNumber')}
                    maxLength={15} className={fieldClass('gstNumber')} placeholder="27AAAAA1111A1Z1" />
                  {errors.gstNumber && <p className="text-red-400 text-[10px] mt-1">{errors.gstNumber}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Aadhaar Number *</label>
                  <input id="va-aadhaar" type="text" value={fields.aadharNumber} onChange={set('aadharNumber')}
                    maxLength={14} className={fieldClass('aadharNumber')} placeholder="1234 5678 9012" />
                  {errors.aadharNumber && <p className="text-red-400 text-[10px] mt-1">{errors.aadharNumber}</p>}
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">Bank Account Number *</label>
                  <input id="va-bank" type="text" value={fields.bankAccount} onChange={set('bankAccount')}
                    maxLength={18} className={fieldClass('bankAccount')} placeholder="123456789012" />
                  {errors.bankAccount && <p className="text-red-400 text-[10px] mt-1">{errors.bankAccount}</p>}
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-white/40 mb-1.5 font-bold">IFSC Code *</label>
                <input id="va-ifsc" type="text" value={fields.ifscCode} onChange={set('ifscCode')}
                  maxLength={11} className={fieldClass('ifscCode')} placeholder="HDFC0001234" />
                {errors.ifscCode && <p className="text-red-400 text-[10px] mt-1">{errors.ifscCode}</p>}
              </div>
            </div>

            {/* Terms notice */}
            <div className="flex gap-3 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
              <AlertCircle size={15} className="text-white/25 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/30 leading-relaxed">
                By submitting, you confirm that all provided details are accurate and match your legal documents.
                A standard 10% commission applies to all sales. Processing takes 2–3 business days.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-3.5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 btn-gold py-3.5 text-xs font-bold tracking-widest uppercase rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
