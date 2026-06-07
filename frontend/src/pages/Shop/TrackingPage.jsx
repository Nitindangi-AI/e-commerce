import React, { useState } from 'react';
import axios from 'axios';
import { toast } from '../../components/GlobalToast';

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    setLoading(true);
    setShipment(null);
    setEvents([]);

    try {
      const res = await axios.get(`/api/v1/orders/track/${trackingNumber.trim()}`);
      if (res.data.success) {
        setShipment(res.data.shipment);
        setEvents(res.data.events || []);
        toast.success("Shipment details retrieved");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Tracking number not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-20 px-6 font-sans">
      <div className="max-w-xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold font-display uppercase tracking-widest text-[#C9A84C]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Track Your Shipment
          </h1>
          <p className="text-sm text-white/50 max-w-sm mx-auto uppercase tracking-wider">
            Enter your tracking number below to view status details
          </p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-4">
          <input
            type="text"
            placeholder="TRK-XXXXXXXX"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="flex-1 bg-[#111] border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-[#C9A84C] text-white placeholder-white/30 tracking-widest"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-[#C9A84C] hover:bg-[#B5963F] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 shadow-md shadow-[#C9A84C]/10"
          >
            {loading ? 'Tracking...' : 'Track'}
          </button>
        </form>

        {shipment && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 md:p-8 space-y-8 animate-slide-in">
            <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/5 text-sm">
              <div>
                <span className="block text-white/30 uppercase text-xxs tracking-wider mb-1">Carrier</span>
                <span className="font-semibold">{shipment.carrier}</span>
              </div>
              <div>
                <span className="block text-white/30 uppercase text-xxs tracking-wider mb-1">Status</span>
                <span className="font-semibold text-[#C9A84C] uppercase tracking-wider">{shipment.status}</span>
              </div>
              <div>
                <span className="block text-white/30 uppercase text-xxs tracking-wider mb-1">Current Location</span>
                <span className="font-semibold">{shipment.current_location || 'Warehouse'}</span>
              </div>
              <div>
                <span className="block text-white/30 uppercase text-xxs tracking-wider mb-1">Estimated Delivery</span>
                <span className="font-semibold">
                  {shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleDateString() : 'Pending'}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">Shipment History</h3>
              {events.length === 0 ? (
                <p className="text-sm text-white/40">No tracking events recorded yet.</p>
              ) : (
                <div className="relative border-l border-white/10 pl-6 ml-2 space-y-8">
                  {events.map((event, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-[#C9A84C] border border-[#0A0A0A]"></div>
                      <div className="space-y-1">
                        <span className="block text-white/30 text-xxs tracking-widest">{new Date(event.timestamp).toLocaleString()}</span>
                        <span className="block text-sm font-semibold uppercase tracking-wider">{event.status}</span>
                        {event.description && <span className="block text-xs text-white/50 leading-relaxed">{event.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
