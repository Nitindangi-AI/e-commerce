import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "../../services/api";

const steps = ["Account", "Personal", "Done"];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "customer",
    storeName: "",
    panCard: "",
    gstNumber: "",
    bankAccount: "",
    aadharNumber: "",
    agree: false
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const roleParam = new URLSearchParams(window.location.search).get("role");
    if (roleParam === "vendor" || roleParam === "customer") {
      set("role", roleParam);
    }
  }, []);

  const validateStep0 = () => {
    const e = {};
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    return e;
  };
  const validateStep1 = () => {
    const e = {};
    if (!form.firstName) e.firstName = "First name is required";
    if (!form.lastName) e.lastName = "Last name is required";
    
    // Vendor onboarding fields validation
    if (form.role === "vendor") {
      if (!form.storeName) e.storeName = "Store Name is required";
      if (!form.panCard) e.panCard = "PAN Card is required";
      if (!form.gstNumber) e.gstNumber = "GST Number is required";
      if (!form.bankAccount) e.bankAccount = "Bank Account is required";
      if (!form.aadharNumber) e.aadharNumber = "Aadhaar is required";
    }
    
    if (!form.agree) e.agree = "You must accept the terms";
    return e;
  };

  const next = async () => {
    const e = step === 0 ? validateStep0() : validateStep1();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (step === 1) {
      setLoading(true);
      try {
        await authAPI.register({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
          storeName: form.storeName,
          panCard: form.panCard,
          gstNumber: form.gstNumber,
          bankAccount: form.bankAccount,
          aadharNumber: form.aadharNumber,
        });
        setStep(2);
      } catch (err) {
        setErrors({ submit: err.message || "Failed to register. Please try again." });
      } finally {
        setLoading(false);
      }
    } else setStep(s => s + 1);
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColors = ["bg-transparent", "bg-red-500", "bg-yellow-400", "bg-green-400"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#f3f0e6] to-[#e8e4d5] text-[#2b2721] flex overflow-hidden grain relative">
      {/* Elegant Ambient Pastel Blur Spheres ( Vibe & Smoothness ) */}
      <div className="absolute top-[-100px] left-[-150px] w-[500px] h-[500px] rounded-full bg-rose-300/15 blur-[120px] pointer-events-none z-0 mix-blend-multiply" />
      <div className="absolute top-[25%] right-[-200px] w-[600px] h-[600px] rounded-full bg-sky-300/12 blur-[130px] pointer-events-none z-0 mix-blend-multiply" />
      <div className="absolute top-[60%] left-[-100px] w-[550px] h-[550px] rounded-full bg-amber-300/12 blur-[110px] pointer-events-none z-0 mix-blend-multiply" />
      <div className="absolute bottom-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full bg-sky-200/10 blur-[120px] pointer-events-none z-0 mix-blend-multiply" />

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col justify-between px-16 py-16 overflow-hidden border-r border-[#e8e4d5] bg-gradient-to-br from-[#faf8f5] via-[#f3f0e6] to-[#e8e4d5] z-10">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-yellow-500/[0.06] blur-3xl" />

        <div>
          <Link to="/" className="display text-2xl font-black tracking-[0.25em] uppercase gold inline-block hover:scale-105 transition-transform duration-300 select-none">
            Trendz
          </Link>
        </div>

        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-yellow-600 mb-4 font-bold">Member Benefits</p>
          <h2 className="display text-4xl font-black mb-10 leading-tight">
            Unlock<br /><span className="gold italic">Exclusive</span><br />Access
          </h2>
          <div className="space-y-5">
            {[
              { icon: "✦", title: "Early Drop Access", desc: "First to know about limited releases" },
              { icon: "◈", title: "Member Pricing", desc: "Up to 20% off on select items" },
              { icon: "⬡", title: "Free Express Shipping", desc: "On all orders above ₹2,999" },
              { icon: "◉", title: "Loyalty Points", desc: "Earn on every purchase" },
            ].map(b => (
              <div key={b.title} className="flex items-start gap-4">
                <span className="gold text-lg mt-0.5">{b.icon}</span>
                <div>
                  <div className="font-bold text-sm text-[#3d3522]">{b.title}</div>
                  <div className="text-[#2b2721]/50 text-xs mt-0.5 font-semibold">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[#2b2721]/35 text-xs font-bold">© 2026 TRENDZ E-COMMERCE</div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-7/12 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-16 relative z-10">
        <div className="max-w-lg mx-auto w-full">

          <div className="lg:hidden mb-10 text-center flex justify-center">
            <span className="display text-2xl font-black tracking-[0.25em] uppercase gold select-none">
              Trendz
            </span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0 mb-12">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    i < step ? "gold-bg border-transparent text-white" :
                    i === step ? "border-yellow-600 text-yellow-600 font-extrabold bg-white/80" :
                    "border-[#e8e4d5] text-[#2b2721]/30 bg-white/40"
                  }`}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] tracking-widest uppercase mt-1.5 ${i === step ? "gold font-extrabold" : "text-[#2b2721]/30 font-semibold"}`}>{s}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-3 mb-4 transition-all duration-500 ${i < step ? "bg-[#d4af37]/50" : "bg-[#e8e4d5]"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 0 — Account */}
          {step === 0 && (
            <div className="slide-up">
              <p className="text-xs tracking-[0.4em] uppercase text-yellow-600 mb-3 font-bold">Step 1 of 2</p>
              <h1 className="display text-4xl font-black mb-2 text-[#3d3522]">Create Account</h1>
              <p className="text-[#2b2721]/60 text-sm mb-10 font-semibold">Set up your login credentials and account type to get started.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Account Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => set("role", "customer")}
                      className={`py-3.5 rounded-xl border text-xs font-bold tracking-widest transition-all duration-300 ${form.role === "customer" ? "border-yellow-600 gold text-yellow-600 bg-yellow-500/10 shadow-sm" : "border-[#e8e4d5] text-[#2b2721]/60 bg-white/50 hover:border-[#d4af37]/45 hover:bg-white"}`}>
                      SHOPPER / CUSTOMER
                    </button>
                    <button type="button" onClick={() => set("role", "vendor")}
                      className={`py-3.5 rounded-xl border text-xs font-bold tracking-widest transition-all duration-300 ${form.role === "vendor" ? "border-yellow-600 gold text-yellow-600 bg-yellow-500/10 shadow-sm" : "border-[#e8e4d5] text-[#2b2721]/60 bg-white/50 hover:border-[#d4af37]/45 hover:bg-white"}`}>
                      MERCHANT / SELLER
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Email Address</label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    placeholder="you@example.com"
                    className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.email ? "input-error" : ""}`} />
                  {errors.email && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 pr-14 font-medium ${errors.password ? "input-error" : ""}`} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2b2721]/40 hover:text-[#d4af37] transition-colors text-xs tracking-wider font-bold">
                      {showPass ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2.5">
                      <div className="flex gap-1.5 mb-1">
                        {[1,2,3].map(l => (
                          <div key={l} className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength >= l ? strengthColors[strength] : "bg-[#e8e4d5]"}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${strength === 1 ? "text-red-500" : strength === 2 ? "text-yellow-600" : "text-green-600"}`}>
                        {strengthLabels[strength]} password
                      </p>
                    </div>
                  )}
                  {errors.password && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.password}</p>}
                </div>
              </div>

              <button onClick={next} className="btn-gold w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase mt-8">
                Continue →
              </button>
              <p className="text-center text-[#2b2721]/50 text-sm mt-6 font-semibold">
                Already registered?{" "}
                <Link to="/login" className="gold hover:underline font-bold">Sign in</Link>
              </p>
            </div>
          )}

          {/* Step 1 — Personal / Onboarding */}
          {step === 1 && (
            <div className="animate-slide-up">
              <p className="text-xs tracking-[0.4em] uppercase text-yellow-600 mb-3 font-bold">Step 2 of 2</p>
              <h1 className="display text-4xl font-black mb-2 text-[#3d3522]">
                {form.role === "vendor" ? "Seller Registration" : "Your Details"}
              </h1>
              <p className="text-[#2b2721]/60 text-sm mb-10 font-semibold">
                {form.role === "vendor" ? "Configure your public storefront and tax credentials." : "Tell us a little about yourself."}
              </p>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">First Name</label>
                    <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
                      placeholder="Alex"
                      className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.firstName ? "input-error" : ""}`} />
                    {errors.firstName && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Last Name</label>
                    <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
                      placeholder="Rivera"
                      className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.lastName ? "input-error" : ""}`} />
                    {errors.lastName && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium" />
                </div>

                {form.role === "vendor" && (
                  <div className="space-y-5 border-t border-[#e8e4d5] pt-5 mt-5">
                    <p className="text-xs font-bold tracking-widest uppercase gold">Store & Legal Details</p>

                    <div>
                      <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Store / Brand Name</label>
                      <input value={form.storeName} onChange={e => set("storeName", e.target.value)}
                        placeholder="Trendz Elite Store"
                        className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.storeName ? "input-error" : ""}`} />
                      {errors.storeName && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.storeName}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">PAN Card Number</label>
                        <input value={form.panCard} onChange={e => set("panCard", e.target.value?.toUpperCase())}
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.panCard ? "input-error" : ""}`} />
                        {errors.panCard && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.panCard}</p>}
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">GSTIN Number</label>
                        <input value={form.gstNumber} onChange={e => set("gstNumber", e.target.value?.toUpperCase())}
                          placeholder="27ABCDE1234F1Z5"
                          maxLength={15}
                          className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.gstNumber ? "input-error" : ""}`} />
                        {errors.gstNumber && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.gstNumber}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Aadhaar Number</label>
                        <input value={form.aadharNumber} onChange={e => set("aadharNumber", e.target.value)}
                          placeholder="1234 5678 9012"
                          maxLength={12}
                          className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.aadharNumber ? "input-error" : ""}`} />
                        {errors.aadharNumber && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.aadharNumber}</p>}
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-[#2b2721]/50 mb-2 font-bold">Bank Payout Account</label>
                        <input value={form.bankAccount} onChange={e => set("bankAccount", e.target.value)}
                          placeholder="Account Number / IFSC"
                          className={`input-field w-full px-5 py-4 rounded-xl text-sm placeholder-[#2b2721]/30 font-medium ${errors.bankAccount ? "input-error" : ""}`} />
                        {errors.bankAccount && <p className="text-red-600 text-xs mt-1.5 font-semibold">{errors.bankAccount}</p>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 pt-2">
                  <button type="button" onClick={() => set("agree", !form.agree)}
                    className={`w-5 h-5 flex-shrink-0 rounded border mt-0.5 flex items-center justify-center transition-all duration-200 ${form.agree ? "gold-bg border-transparent" : "border-[#e8e4d5] bg-white/70"}`}>
                    {form.agree && <svg className="w-3 h-3 text-white font-extrabold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>}
                  </button>
                  <span className="text-sm text-[#2b2721]/60 leading-relaxed font-semibold">
                    I agree to TRENDZ's{" "}
                    <a href="#" className="gold hover:underline font-bold">Terms of Service</a> and{" "}
                    <a href="#" className="gold hover:underline font-bold">Privacy Policy</a>
                  </span>
                </div>
                {errors.agree && <p className="text-red-600 text-xs font-semibold">{errors.agree}</p>}
                {errors.submit && <p className="text-red-600 text-sm font-semibold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl mt-3">{errors.submit}</p>}
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)} className="border border-[#e8e4d5] bg-white/50 px-6 py-4 rounded-xl text-sm text-[#2b2721]/60 hover:border-[#d4af37]/45 hover:text-[#2b2721] hover:bg-white transition-all">
                  ← Back
                </button>
                <button onClick={next} disabled={loading}
                  className="btn-gold flex-1 py-4 rounded-xl text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Creating...
                    </>
                  ) : "Create Account"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div className="text-center animate-slide-up">
              <div className="animate-pop-in w-24 h-24 gold-bg rounded-full flex items-center justify-center text-4xl mx-auto mb-8 text-white font-black">
                ✓
              </div>
              <h1 className="display text-4xl font-black mb-3 text-[#3d3522]">
                {form.role === "vendor" ? "Application Received!" : "Welcome to TRENDZ!"}
              </h1>
              <p className="text-[#2b2721]/60 mb-10 max-w-sm mx-auto leading-relaxed font-semibold">
                {form.role === "vendor" 
                  ? "Your application is under review by our administrators. We will verify your store credentials and tax documents. Once approved, you can login to manage your seller account." 
                  : "Your customer account is ready. Start exploring our premium collections."}
              </p>
              <div className="space-y-3 max-w-xs mx-auto">
                {form.role === "vendor" ? (
                  <Link to="/login" className="btn-gold block w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase text-center">
                    Return to Login
                  </Link>
                ) : (
                  <>
                    <Link to="/" className="btn-gold block w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase text-center">
                      Start Shopping
                    </Link>
                    <Link to="/login" className="block w-full py-4 rounded-xl text-sm tracking-widest uppercase border border-[#e8e4d5] bg-white/50 text-[#2b2721]/50 hover:border-[#d4af37]/45 hover:text-[#2b2721] hover:bg-white transition-all text-center">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}