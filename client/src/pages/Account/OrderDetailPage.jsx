import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { orderAPI, logisticsAPI } from "../../services/api";
import toast from "react-hot-toast";

const STATUS_FLOW = ["Processing", "Confirmed", "Shipped", "Out for Delivery", "Delivered"];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnModal, setReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    orderAPI.getById(id)
      .then(async d => {
        setOrder(d.order);
        if (["Shipped", "Out for Delivery", "Delivered"].includes(d.order.orderStatus)) {
          try {
            const sRes = await logisticsAPI.getShipmentByOrderId(d.order.id);
            if (sRes.success && sRes.shipment) {
              setShipment(sRes.shipment);
            }
          } catch (err) {
            console.error("Failed to load logistics shipment details:", err);
          }
        }
      })
      .catch(err => { toast.error(err.message); navigate("/account"); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const fmt = (p) => `₹${(p || 0).toLocaleString("en-IN")}`;

  const handleRequestReturn = async () => {
    if (!returnReason.trim()) { toast.error("Please provide a reason"); return; }
    setSubmitting(true);
    try {
      await orderAPI.requestReturn(order._id || order.id, returnReason);
      toast.success("Return request submitted — free returns!");
      setReturnModal(false);
      setReturnReason("");
      // Reload updated order
      const res = await orderAPI.getById(id);
      if (res.success) setOrder(res.order);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await orderAPI.cancel(order._id || order.id);
      toast.success("Order cancelled");
      // Reload updated order
      const res = await orderAPI.getById(id);
      if (res.success) setOrder(res.order);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-28">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const currentStatusIdx = STATUS_FLOW.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === "Cancelled";
  const isReturned = order.orderStatus === "Returned" || order.orderStatus === "Return Requested";
  const progressPercent = currentStatusIdx >= 0 ? (currentStatusIdx / (STATUS_FLOW.length - 1)) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-8">
        <Link to="/account" className="hover:text-gold transition-colors">My Account</Link>
        <span>/</span>
        <span className="text-white/70">Order #{order.orderId}</span>
      </div>

      {/* Order Header */}
      <div className="bg-luxe-card border border-white/5 rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-2xl font-black mb-1">Order #{order.orderId}</h1>
            <p className="text-sm text-white/40">Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="text-right">
            <p className="gold font-bold text-2xl">{fmt(order.totalAmount)}</p>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full inline-block mt-1 ${
              { "Processing": "text-yellow-400 bg-yellow-500/10", "Confirmed": "text-blue-400 bg-blue-500/10", "Shipped": "text-sky-500 bg-sky-500/10", "Out for Delivery": "text-teal-500 bg-teal-500/10", "Delivered": "text-green-400 bg-green-500/10", "Cancelled": "text-red-400 bg-red-500/10", "Return Requested": "text-orange-400 bg-orange-500/10", "Returned": "text-red-400 bg-red-500/10" }[order.orderStatus] || "text-white/50 bg-white/5"
            }`}>{order.orderStatus}</span>
          </div>
        </div>
      </div>

      {/* Status Timeline (full-size) */}
      {!isCancelled && !isReturned && (
        <div className="bg-luxe-card border border-white/5 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">📦 Order Tracking</h3>

          {/* Progress Bar */}
          <div className="relative mb-8">
            <div className="h-1 bg-white/10 rounded-full">
              <div className="h-1 rounded-full gold-bg transition-all duration-700" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Timeline Steps */}
          <div className="flex justify-between">
            {STATUS_FLOW.map((status, i) => {
              const historyEntry = order.statusHistory?.find(h => h.status === status);
              const isCompleted = i <= currentStatusIdx;
              const isCurrent = i === currentStatusIdx;

              return (
                <div key={status} className="flex flex-col items-center text-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isCompleted ? "gold-bg" : "bg-white/10"
                  } ${isCurrent ? "ring-4 ring-gold/20" : ""}`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    ) : (
                      <span className="text-xs text-white/30">{i + 1}</span>
                    )}
                  </div>
                  <p className={`text-xs font-medium ${isCompleted ? "text-white" : "text-white/30"}`}>{status}</p>
                  {historyEntry && (
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {new Date(historyEntry.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  )}
                  {historyEntry?.note && historyEntry.note !== "Order placed successfully" && (
                    <p className="text-[10px] text-gold/70 mt-0.5 max-w-[100px] leading-tight">{historyEntry.note}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Estimated Delivery */}
          {order.estimatedDelivery && order.orderStatus !== "Delivered" && (
            <div className="mt-6 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  Expected by {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          )}

          {order.orderStatus === "Delivered" && order.deliveredAt && (
            <div className="mt-6 p-3 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center gap-3">
              <span className="text-lg">✅</span>
              <p className="text-sm text-green-400">
                Delivered on {new Date(order.deliveredAt).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          )}

          {/* Live Logistics Routing Console */}
          {shipment && (
            <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#d4af37] font-black block mb-1">
                    Distributed Global Delivery Network
                  </span>
                  <h4 className="text-base font-bold text-white uppercase tracking-wider">
                    🛰️ Real-time Transit Telemetry
                  </h4>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5">
                    AWB Tracking Code: {shipment.shipment_id}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full text-gold">
                    {shipment.delivery_mode} routing
                  </span>
                </div>
              </div>

              {/* Expected Delivery SLA & Driver Profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SLA Info */}
                <div className="p-4 bg-black/35 border border-white/5 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
                    📅
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-white/40 block font-black">
                      Delivery Time Agreement (SLA)
                    </span>
                    <p className="font-bold text-white text-[11px] mt-0.5">
                      {shipment.status === 'Delivered' ? 'Delivered successfully' : `Estimated transit ongoing`}
                    </p>
                    <p className="text-[10px] text-white/40 leading-none mt-1">
                      Carrier Partner: {shipment.contractors?.name || 'Trendz Express Courier'}
                    </p>
                  </div>
                </div>

                {/* Assigned Driver Profile */}
                {shipment.vehicles && (
                  <div className="p-4 bg-black/35 border border-white/5 rounded-2xl flex items-center gap-4 text-xs">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f5d26e] flex items-center justify-center font-bold text-black text-sm">
                      👨‍✈️
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] uppercase tracking-widest text-white/40 block font-black">
                        Allocated Fleet Driver
                      </span>
                      <p className="font-bold text-white text-[11px] truncate mt-0.5">
                        {shipment.vehicles.driver_name} (Rating: ★{shipment.vehicles.rating || '4.9'})
                      </p>
                      <p className="text-[9px] text-white/40 truncate mt-0.5">
                        Vehicle: {shipment.vehicles.type} · Plate: {shipment.vehicles.vehicle_id}
                      </p>
                    </div>
                    <a 
                      href={`tel:${shipment.vehicles.driver_phone}`} 
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-gold hover:bg-gold/5 text-[9px] uppercase tracking-wider font-bold transition-all text-white/70 hover:text-white"
                    >
                      Call Driver
                    </a>
                  </div>
                )}
              </div>

              {/* Interactive Route Node Map */}
              <div className="space-y-3">
                <span className="text-[9px] uppercase tracking-widest text-white/40 block font-black">
                  Fulfillment Depot Routing Sequence
                </span>
                <div className="border border-white/5 bg-black/25 p-5 rounded-2xl space-y-5 relative">
                  {/* Vertical timeline connecting line */}
                  <div className="absolute top-8 bottom-8 left-[23px] w-[2px] bg-white/5" />

                  {shipment.routes?.map((route, idx) => {
                    const statuses = [
                      'Shipment Request', 'Pickup Scheduled', 'International Shipping',
                      'Country Hub', 'State Hub', 'District Hub', 'Last Mile Delivery', 'Delivered'
                    ];
                    const currIdx = statuses.indexOf(shipment.status);
                    const isCompleted = idx < currIdx || shipment.status === 'Delivered';
                    const isActive = idx === currIdx && shipment.status !== 'Delivered';

                    return (
                      <div key={route.id} className="flex gap-4 items-start relative z-10">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-green-500 border-green-500 text-black' 
                            : isActive 
                              ? 'bg-gold border-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.4)]' 
                              : 'bg-neutral-900 border-white/10 text-white/20'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex justify-between items-start gap-2 flex-wrap">
                            <p className={`font-bold text-[11.5px] ${isActive ? 'text-gold' : isCompleted ? 'text-white' : 'text-white/40'}`}>
                              {route.from_location} → {route.to_location}
                            </p>
                            <span className={`text-[8px] tracking-widest uppercase font-black px-2 py-0.5 rounded border ${
                              isActive 
                                ? 'bg-gold/10 border-gold/20 text-gold' 
                                : 'bg-white/5 border-white/5 text-white/30'
                            }`}>
                              {route.transport_type}
                            </span>
                          </div>
                          <p className={`text-[10px] mt-0.5 ${isActive ? 'text-white/60' : 'text-white/30'}`}>
                            Sequence Stage #{route.sequence_order} · Estimated Transit: {route.estimated_days} day(s)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secure Verification OTP Lockbox */}
              {shipment.status !== 'Delivered' && (
                <div className="bg-gradient-to-br from-yellow-500/[0.01] to-yellow-500/[0.03] border border-yellow-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h5 className="font-black text-xs gold uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                      🔑 Secure Handoff Verification Key
                    </h5>
                    <p className="text-[10px] text-white/40 leading-relaxed max-w-md">
                      Share this OTP with the courier driver upon safe receipt of your package to verify delivery and release your consignment.
                    </p>
                  </div>
                  <div className="bg-black/50 border border-yellow-500/35 px-6 py-3.5 rounded-xl text-center shadow-inner flex-shrink-0">
                    <span className="text-[9px] uppercase tracking-widest text-yellow-500/60 block font-bold mb-0.5">Your Handoff OTP</span>
                    <span className="font-mono font-black text-lg tracking-widest text-white block select-all">
                      {shipment.otp_code || 'OTP-GENERATE'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cancelled / Returned status */}
      {isCancelled && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6">
          <p className="text-red-400 font-medium flex items-center gap-2">❌ Order Cancelled</p>
          {order.paymentStatus === "refunded" && <p className="text-sm text-white/40 mt-1">Full refund has been processed.</p>}
        </div>
      )}
      {isReturned && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 mb-6">
          <p className="text-orange-400 font-medium flex items-center gap-2">
            🔄 {order.orderStatus === "Return Requested" ? "Return request is being reviewed" : "Return completed — full refund issued"}
          </p>
          {order.returnReason && <p className="text-sm text-white/40 mt-1">Reason: {order.returnReason}</p>}
          {order.returnRequestedAt && <p className="text-xs text-white/30 mt-1">Requested on {new Date(order.returnRequestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items + Timeline History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4">📦 Items ({order.orderItems.length})</h3>
            <div className="space-y-4">
              {order.orderItems.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <img src={item.image} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">Qty: {item.quantity}{item.color ? ` · ${item.color}` : ""}{item.size ? ` · ${item.size}` : ""}</p>
                    <p className="gold text-sm font-semibold mt-1">{fmt(item.price)} × {item.quantity}</p>
                  </div>
                  <span className="gold font-bold">{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Status History Log */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-4">📋 Status History</h3>
              <div className="space-y-3">
                {[...order.statusHistory].reverse().map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? "bg-gold" : "bg-white/20"}`} />
                    <div>
                      <p className="text-sm font-medium">{entry.status}</p>
                      <p className="text-xs text-white/40">{new Date(entry.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      {entry.note && <p className="text-xs text-white/50 mt-0.5">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary + Actions */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4">💰 Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/50">Subtotal</span><span>{fmt(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Shipping</span><span className={order.shippingCost === 0 ? "text-green-400" : ""}>{order.shippingCost === 0 ? "FREE" : fmt(order.shippingCost)}</span></div>
              {order.discount > 0 && <div className="flex justify-between"><span className="text-white/50">Discount</span><span className="text-green-400">-{fmt(order.discount)}</span></div>}
              {order.couponCode && <div className="flex justify-between"><span className="text-white/50">Coupon</span><span className="text-gold">{order.couponCode}</span></div>}
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="gold">{fmt(order.totalAmount)}</span></div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4">💳 Payment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/50">Method</span><span className="capitalize">{order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod?.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Status</span><span className={`capitalize ${order.paymentStatus === "paid" ? "text-green-400" : order.paymentStatus === "refunded" ? "text-blue-400" : "text-yellow-400"}`}>{order.paymentStatus}</span></div>
              {order.paymentDetails?.transactionId && (
                <div className="flex justify-between"><span className="text-white/50">TXN ID</span><span className="font-mono text-xs">{order.paymentDetails.transactionId}</span></div>
              )}
            </div>
            {order.paymentMethod !== "cod" && order.paymentDetails?.sellerAccountHolder && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-gold mb-1">Payment Routed To:</p>
                <p className="text-sm">{order.paymentDetails.sellerAccountHolder}</p>
                {order.paymentDetails.sellerUpiId && <p className="text-xs text-white/40">{order.paymentDetails.sellerUpiId}</p>}
                {order.paymentDetails.sellerBankName && <p className="text-xs text-white/40">{order.paymentDetails.sellerBankName}</p>}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4">📍 Shipping Address</h3>
            <p className="text-sm text-white/70">{order.shippingAddress?.name}</p>
            <p className="text-sm text-white/70">{order.shippingAddress?.phone}</p>
            <p className="text-xs text-white/40 mt-1">
              {order.shippingAddress?.line1}{order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ""}
            </p>
            <p className="text-xs text-white/40">{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
          </div>

          {/* Return Policy */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-sm font-medium text-emerald-400 mb-1">🔄 5-Day Free Return Policy</p>
            <p className="text-xs text-white/40">Free returns within 5 days of delivery. No shipping costs.</p>
            {order.returnEligible && (
              <p className="text-xs text-gold mt-1 font-medium">{order.returnDaysRemaining} days remaining</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {(order.orderStatus === "Processing" || order.orderStatus === "Confirmed") && (
              <button onClick={handleCancel} className="w-full py-3 rounded-xl text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                Cancel Order
              </button>
            )}
            {order.returnEligible && (
              <button onClick={() => setReturnModal(true)} className="w-full py-3 rounded-xl text-sm bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors font-medium">
                🔄 Request Free Return ({order.returnDaysRemaining}d left)
              </button>
            )}
            <Link to="/account" className="block text-center text-xs text-gold hover:underline py-2">← Back to My Orders</Link>
          </div>
        </div>
      </div>

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setReturnModal(false)}>
          <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Request Free Return</h3>
            <p className="text-xs text-white/40 mb-1">All returns are completely free — no shipping costs.</p>
            <p className="text-xs text-emerald-400 mb-4">🔄 Full refund will be processed once approved.</p>
            <div className="mb-4">
              <label className="block text-xs text-white/40 tracking-widest uppercase mb-2">Reason</label>
              <select value={returnReason} onChange={e => setReturnReason(e.target.value)} className="input-field w-full px-4 py-3 rounded-xl text-sm mb-3">
                <option value="">Select a reason</option>
                <option value="received different product">received different product</option>
                <option value="received wrong product">received wrong product</option>
                <option value="received defected product">received defected product</option>
                <option value="received wrong size">received wrong size</option>
                <option value="received wrong color">received wrong color</option>
                <option value="Other">Other</option>
              </select>
              {returnReason === "Other" && (
                <input placeholder="Please specify..." onChange={e => setReturnReason(e.target.value)} className="input-field w-full px-4 py-3 rounded-xl text-sm" />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReturnModal(false)} className="btn-outline flex-1 py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={handleRequestReturn} disabled={submitting} className="btn-gold flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
