import { useEffect } from "react";

export default function AddressForm({ address, setAddress, onValidate }) {
  
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Name */}
      <div>
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">Full Name *</label>
        <input 
          name="name" 
          value={address.name || ""} 
          onChange={handleChange} 
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="John Doe" 
        />
      </div>

      {/* Mobile Number */}
      <div>
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">Mobile Number (10 digits) *</label>
        <input 
          name="phone" 
          value={address.phone || ""} 
          onChange={handleChange} 
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="9876543210" 
          maxLength={10} 
        />
      </div>

      {/* Pincode */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">Pincode (6 digits) *</label>
        <input 
          name="pincode" 
          value={address.pincode || ""} 
          onChange={handleChange} 
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="400058" 
          maxLength={6} 
        />
      </div>

      {/* State */}
      <div>
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">State *</label>
        <input 
          name="state"
          value={address.state || ""} 
          onChange={handleChange}
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="Maharashtra" 
        />
      </div>

      {/* City */}
      <div>
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">City *</label>
        <input 
          name="city"
          value={address.city || ""} 
          onChange={handleChange}
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="Mumbai" 
        />
      </div>

      {/* Area */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">Area / Locality *</label>
        <input 
          name="area"
          value={address.area || ""} 
          onChange={handleChange}
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="Andheri West" 
        />
      </div>

      {/* Place (Full Address) */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">Full Address / Place *</label>
        <input 
          name="line1" 
          value={address.line1 || ""} 
          onChange={handleChange} 
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="House No, Building, Street Name" 
        />
      </div>

      {/* Landmark */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">Landmark (Optional)</label>
        <input 
          name="landmark" 
          value={address.landmark || ""} 
          onChange={handleChange} 
          className="input-field w-full px-4 py-3 rounded-xl text-sm" 
          placeholder="E.g. Near Apollo Hospital" 
        />
      </div>

      {/* Address Type */}
      <div className="sm:col-span-2">
        <label className="block text-xs text-white/40 tracking-widest uppercase mb-1">Address Type</label>
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
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
