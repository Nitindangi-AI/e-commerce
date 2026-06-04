import { useEffect, useState } from "react";

export default function AddressForm({ address, setAddress, onValidate }) {
  const [touched, setTouched] = useState({});

  // Real-time client-side address validation
  useEffect(() => {
    const { name, phone, state, city, area, line1, pincode } = address;
    const isValid = !!(
      name?.trim() && 
      phone?.trim() && 
      phone?.trim().length === 10 &&
      state?.trim() && 
      city?.trim() && 
      area?.trim() && 
      line1?.trim() && 
      pincode?.trim() && 
      pincode?.trim().length === 6
    );
    onValidate(isValid);
  }, [address, onValidate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Simple digit-only constraints for numbers
    if (name === "pincode" && value && !/^\d*$/.test(value)) return;
    if (name === "phone" && value && !/^\d*$/.test(value)) return;
    
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const getError = (fieldName) => {
    if (!touched[fieldName]) return null;
    const val = (address[fieldName] || "").trim();
    if (!val) {
      const displayName = fieldName === "line1" ? "Address" : fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      return `${displayName} is required`;
    }
    if (fieldName === "phone" && val.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
    if (fieldName === "pincode" && val.length !== 6) {
      return "Pincode must be exactly 6 digits";
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Name */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">Full Name *</label>
        <input 
          name="name" 
          value={address.name || ""} 
          onChange={handleChange} 
          onBlur={handleBlur}
          className={`input-field w-full px-4 py-3 rounded-xl text-sm ${getError("name") ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20" : ""}`} 
          placeholder="John Doe" 
        />
        {getError("name") && <p className="text-red-500 text-[11px] mt-1 font-semibold">{getError("name")}</p>}
      </div>

      {/* Mobile Number */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">Mobile Number (10 digits) *</label>
        <input 
          name="phone" 
          value={address.phone || ""} 
          onChange={handleChange} 
          onBlur={handleBlur}
          className={`input-field w-full px-4 py-3 rounded-xl text-sm ${getError("phone") ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20" : ""}`} 
          placeholder="9876543210" 
          maxLength={10} 
        />
        {getError("phone") && <p className="text-red-500 text-[11px] mt-1 font-semibold">{getError("phone")}</p>}
      </div>

      {/* Pincode */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">Pincode (6 digits) *</label>
        <input 
          name="pincode" 
          value={address.pincode || ""} 
          onChange={handleChange} 
          onBlur={handleBlur}
          className={`input-field w-full px-4 py-3 rounded-xl text-sm ${getError("pincode") ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20" : ""}`} 
          placeholder="400058" 
          maxLength={6} 
        />
        {getError("pincode") && <p className="text-red-500 text-[11px] mt-1 font-semibold">{getError("pincode")}</p>}
      </div>

      {/* State */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">State *</label>
        <input 
          name="state"
          value={address.state || ""} 
          onChange={handleChange}
          onBlur={handleBlur}
          className={`input-field w-full px-4 py-3 rounded-xl text-sm ${getError("state") ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20" : ""}`} 
          placeholder="Maharashtra" 
        />
        {getError("state") && <p className="text-red-500 text-[11px] mt-1 font-semibold">{getError("state")}</p>}
      </div>

      {/* City */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">City *</label>
        <input 
          name="city"
          value={address.city || ""} 
          onChange={handleChange}
          onBlur={handleBlur}
          className={`input-field w-full px-4 py-3 rounded-xl text-sm ${getError("city") ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20" : ""}`} 
          placeholder="Mumbai" 
        />
        {getError("city") && <p className="text-red-500 text-[11px] mt-1 font-semibold">{getError("city")}</p>}
      </div>

      {/* Area */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">Area / Locality *</label>
        <input 
          name="area"
          value={address.area || ""} 
          onChange={handleChange}
          onBlur={handleBlur}
          className={`input-field w-full px-4 py-3 rounded-xl text-sm ${getError("area") ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20" : ""}`} 
          placeholder="Andheri West" 
        />
        {getError("area") && <p className="text-red-500 text-[11px] mt-1 font-semibold">{getError("area")}</p>}
      </div>

      {/* Place (Full Address) */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">Full Address / Place *</label>
        <input 
          name="line1" 
          value={address.line1 || ""} 
          onChange={handleChange} 
          onBlur={handleBlur}
          className={`input-field w-full px-4 py-3 rounded-xl text-sm ${getError("line1") ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20" : ""}`} 
          placeholder="House No, Building, Street Name" 
        />
        {getError("line1") && <p className="text-red-500 text-[11px] mt-1 font-semibold">{getError("line1")}</p>}
      </div>

      {/* Landmark */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">Landmark (Optional)</label>
        <input 
          name="landmark" 
          value={address.landmark || ""} 
          onChange={handleChange} 
          className="input-field w-full px-4 py-3 rounded-xl text-sm focus:border-gold/50" 
          placeholder="E.g. Near Apollo Hospital" 
        />
      </div>

      {/* Address Type */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-[var(--text-secondary)] tracking-widest uppercase mb-1 font-semibold">Address Type</label>
        <div className="flex gap-4">
          {["Home", "Work", "Other"].map(type => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="label" 
                value={type} 
                checked={address.label === type || (!address.label && type === "Home")} 
                onChange={handleChange} 
                className="accent-gold" 
              />
              <span className="text-sm text-[var(--text-primary)] font-medium">{type}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
