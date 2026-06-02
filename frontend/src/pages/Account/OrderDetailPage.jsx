import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { orderAPI, logisticsAPI } from "../../services/api";
import toast from "react-hot-toast";
import { FileText, CheckCircle, Package, Truck, Home, XCircle, ArrowLeft } from "lucide-react";

const STATUS_FLOW = ["Processing", "Confirmed", "Shipped", "Out for Delivery", "Delivered"];

const STATUS_ICONS = {
  "Processing": FileText,
  "Confirmed": CheckCircle,
  "Shipped": Package,
  "Out for Delivery": Truck,
  "Delivered": Home
};

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
    let active = true;
    
    async function loadData() {
      try {
        const oRes = await orderAPI.getById(id);
        if (active && oRes.success && oRes.order) {
          setOrder(oRes.order);
          
          if (["Shipped", "Out for Delivery", "Delivered"].includes(oRes.order.orderStatus)) {
            try {
              const sRes = await logisticsAPI.getShipmentByOrderId(oRes.order.id);
              if (active && sRes.success && sRes.shipment) {
                setShipment(sRes.shipment);
              }
            } catch (err) {
              console.error("Failed to load logistics shipment details:", err);
            }
          }
        }
      } catch (err) {
        if (active) {
          toast.error(err.message || "Failed to load order details");
          navigate("/account");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [id, navigate]);

  const fmt = (p) => `₹${(p || 0).toLocaleString("en-IN")}`;

  const handleRequestReturn = async () => {
    if (!returnReason.trim()) { 
      toast.error("Please select or specify a reason"); 
      return; 
    }
    setSubmitting(true);
    try {
      await orderAPI.requestReturn(order._id || order.id, returnReason);
      toast.success("Return request submitted successfully");
      setReturnModal(false);
      setReturnReason("");
      
      const res = await orderAPI.getById(id);
      if (res.success) setOrder(res.order);
    } catch (err) {
      toast.error(err.message || "Failed to submit return request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await orderAPI.cancel(order._id || order.id);
      toast.success("Order cancelled successfully");
      
      const res = await orderAPI.getById(id);
      if (res.success) setOrder(res.order);
    } catch (err) {
      toast.error(err.message || "Failed to cancel order");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-28 bg-[var(--bg-gradient)]">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-28 bg-[var(--bg-gradient)] text-[var(--text-primary)]">
        <p className="text-[var(--text-secondary)] text-sm mb-4">Order details not found.</p>
        <Link to="/account" className="btn-gold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold">Back to Orders</Link>
      </div>
    );
  }

  const currentStatusIdx = STATUS_FLOW.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === "Cancelled";
  const isReturned = order.orderStatus === "Returned" || order.orderStatus === "Return Requested";

  const cardBg = "bg-luxe-card border border-[var(--card-border)] rounded-2xl p-6 shadow-card";
  const textTitle = "text-[var(--text-primary)]";
  const textSubtle = "text-[var(--text-secondary)]";

  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 min-h-screen bg-[var(--bg-gradient)] text-[var(--text-primary)]">
      
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] tracking-wider mb-8">
        <Link to="/account" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 font-bold">
          <ArrowLeft size={14} /> My Account
        </Link>
        <span>/</span>
        <span>Order #{order.orderId || order.id.slice(0, 8)}</span>
      </div>

      {/* Header Panel */}
      <div className={`${cardBg} mb-6`}>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="display text-2xl font-black mb-1">Order #{order.orderId || order.id.slice(0, 8)}</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { 
                weekday: "long", day: "numeric", month: "long", year: "numeric" 
              })}
            </p>
          </div>
          
          <div className="text-left sm:text-right">
            <p className="text-gold font-bold text-2xl leading-none mb-1.5">{fmt(order.totalAmount)}</p>
            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border ${
              {
                "Processing": "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
                "Confirmed": "text-blue-500 bg-blue-500/10 border-blue-500/20",
                "Shipped": "text-sky-500 bg-sky-500/10 border-sky-500/20",
                "Out for Delivery": "text-pink-500 bg-pink-500/10 border-pink-500/20",
                "Delivered": "text-green-500 bg-green-500/10 border-green-500/20",
                "Cancelled": "text-red-500 bg-red-500/10 border-red-500/20",
                "Return Requested": "text-orange-500 bg-orange-500/10 border-orange-500/20",
                "Returned": "text-red-500 bg-red-500/10 border-red-500/20"
              }[order.orderStatus] || "text-slate-500 bg-slate-500/10 border-slate-500/20"
            }`}>
              {order.orderStatus}
            </span>
          </div>
        </div>
      </div>

      {/* 📦 Order Status Timeline */}
      {!isCancelled && !isReturned && (
        <div className={`${cardBg} mb-6`}>
          <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-8">📦 Order Tracking</h3>
          
          {/* Progress Timeline Nodes */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative gap-8 sm:gap-4">
            
            {/* Horizontal Line background for SM and wider */}
            <div className="hidden sm:block absolute left-4 right-4 top-5 h-[2px] bg-[var(--card-border)] z-0" />

            {STATUS_FLOW.map((status, i) => {
              const Icon = STATUS_ICONS[status] || Package;
              const isCompleted = i <= currentStatusIdx;
              const isCurrent = i === currentStatusIdx;
              const historyEntry = order.statusHistory?.find(h => h.status === status);

              return (
                <div key={status} className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-2 flex-1 z-10 w-full">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCurrent 
                        ? "bg-gold text-black shadow-lg shadow-gold/30 ring-4 ring-gold/15" 
                        : isCompleted 
                          ? "bg-gold/10 text-gold border border-gold/30" 
                          : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)]/40"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  
                  <div className="text-left sm:text-center">
                    <p className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? "text-gold" : isCompleted ? textTitle : "text-[var(--text-secondary)]/50"}`}>
                      {status}
                    </p>
                    
                    {historyEntry && (
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">
                        {new Date(historyEntry.timestamp).toLocaleDateString("en-IN", { 
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" 
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SLA Expected Date Banner */}
          {order.estimatedDelivery && order.orderStatus !== "Delivered" && (
            <div className="mt-8 p-4 bg-green-500/[0.02] border border-green-500/10 rounded-xl flex items-center gap-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest leading-none mb-1">Estimated Delivery SLA</p>
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Your delivery is expected on or before <strong className={textTitle}>{new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}</strong>.
                </p>
              </div>
            </div>
          )}

          {order.orderStatus === "Delivered" && order.deliveredAt && (
            <div className="mt-6 p-4 bg-green-500/5 border border-green-500/15 rounded-xl flex items-center gap-3">
              <span className="text-lg">✓</span>
              <div>
                <p className="text-xs font-bold text-green-500 uppercase tracking-widest leading-none mb-1">Delivered Successfully</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Handed over on {new Date(order.deliveredAt).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}.
                </p>
              </div>
            </div>
          )}

          {/* Real-time Logistics Routing Console */}
          {shipment && (
            <div className="mt-8 pt-8 border-t border-[var(--card-border)] space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-gold font-black block mb-1">
                    Distributed Global Delivery Network
                  </span>
                  <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    🛰️ Live Transit Telemetry
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                    AWB Tracking Code: {shipment.shipment_id}
                  </p>
                </div>
                
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-gold/10 border border-gold/20 px-3 py-1 rounded-full text-gold">
                    {shipment.delivery_mode} routing
                  </span>
                </div>
              </div>

              {/* Carrier & Driver details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg-gradient)] border border-[var(--card-border)] rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold/5 border border-gold/10 flex items-center justify-center text-lg">
                    🚚
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)] block font-black">
                      Carrier Partner SLA
                    </span>
                    <p className="font-bold text-[var(--text-primary)] text-xs mt-0.5">
                      {shipment.contractors?.name || 'Trendy Express Courier'}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      Routing Zone: {shipment.contractors?.country || 'Domestic'}
                    </p>
                  </div>
                </div>

                {shipment.vehicles && (
                  <div className="p-4 bg-[var(--bg-gradient)] border border-[var(--card-border)] rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gold text-black flex items-center justify-center font-bold text-sm">
                      👨‍✈️
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] uppercase tracking-widest text-[var(--text-secondary)] block font-black">
                        Allocated Fleet Driver
                      </span>
                      <p className="font-bold text-[var(--text-primary)] text-xs truncate mt-0.5">
                        {shipment.vehicles.driver_name} (Rating: ★{shipment.vehicles.rating || '4.9'})
                      </p>
                      <p className="text-[9px] text-[var(--text-secondary)] truncate">
                        Plate: {shipment.vehicles.vehicle_id}
                      </p>
                    </div>
                    <a 
                      href={`tel:${shipment.vehicles.driver_phone}`} 
                      className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-gold hover:bg-gold/5 text-[9px] uppercase tracking-wider font-bold transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Call
                    </a>
                  </div>
                )}
              </div>

              {/* Transit milestones list */}
              {shipment.routes && (
                <div className="space-y-3">
                  <span className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] block font-black">
                    Fulfillment Depot Milestones
                  </span>
                  
                  <div className="border border-[var(--card-border)] bg-[var(--bg-gradient)] p-5 rounded-2xl space-y-4 relative">
                    <div className="absolute top-8 bottom-8 left-[23px] w-[2px] bg-[var(--card-border)] z-0" />
                    
                    {shipment.routes.map((route, idx) => {
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
                                ? 'bg-gold border-gold text-black shadow-lg shadow-gold/20' 
                                : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)]/30'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <p className={`font-bold text-xs ${isActive ? 'text-gold' : isCompleted ? textTitle : 'text-[var(--text-secondary)]/40'}`}>
                                {route.from_location} → {route.to_location}
                              </p>
                              <span className={`text-[8px] tracking-widest uppercase font-black px-2 py-0.5 rounded border ${
                                isActive ? 'bg-gold/10 border-gold/20 text-gold' : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)]/30'
                              }`}>
                                {route.transport_type}
                              </span>
                            </div>
                            <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">
                              Sequence Stage #{route.sequence_order} · Transit duration: {route.estimated_days} day(s)
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OTP Delivery Verification Lock */}
              {shipment.status !== 'Delivered' && (
                <div className="bg-gold/[0.02] border border-gold/20 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h5 className="font-black text-xs text-gold uppercase tracking-wider">
                      🔑 Delivery Verification OTP Key
                    </h5>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed max-w-sm">
                      Please supply this key to the delivery driver to verify receipt of package.
                    </p>
                  </div>
                  <div className="bg-black/40 border border-gold/25 px-5 py-2.5 rounded-xl text-center flex-shrink-0">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] block font-bold mb-0.5">Verification Key</span>
                    <span className="font-mono font-black text-sm tracking-widest text-gold block select-all">
                      {shipment.otp_code || 'OTP-PENDING'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="bg-red-500/5 border border-red-500/25 rounded-2xl p-5 mb-6">
          <p className="text-red-500 font-bold text-sm flex items-center gap-2">❌ Order Cancelled</p>
          {order.paymentStatus === "refunded" && (
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              Refund has been completed. The amount has been credited back to your original source of payment.
            </p>
          )}
        </div>
      )}

      {/* Returned Banner */}
      {isReturned && (
        <div className="bg-orange-500/5 border border-orange-500/25 rounded-2xl p-5 mb-6 space-y-1">
          <p className="text-orange-500 font-bold text-sm flex items-center gap-2">
            🔄 {order.orderStatus === "Return Requested" ? "Return under evaluation" : "Returned & Refunded"}
          </p>
          {order.returnReason && <p className="text-xs text-[var(--text-secondary)] font-medium">Reason: {order.returnReason}</p>}
          {order.returnRequestedAt && (
            <p className="text-[10px] text-[var(--text-secondary)]/50">
              Filed on {new Date(order.returnRequestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Items Ordered */}
        <div className="lg:col-span-2 space-y-6">
          <div className={cardBg}>
            <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-5">📦 Items in this Order ({order.orderItems.length})</h3>
            
            <div className="space-y-4">
              {order.orderItems.map((item, i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-[var(--card-border)]/5 last:border-0 last:pb-0">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-[var(--card-border)] flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--text-primary)] truncate">{item.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      Qty: {item.quantity} {item.color && `· Color: ${item.color}`} {item.size && `· Size: ${item.size}`}
                    </p>
                    <p className="gold text-xs font-bold mt-1">
                      {fmt(item.price)} × {item.quantity}
                    </p>
                  </div>
                  
                  <span className="text-gold font-bold text-sm whitespace-nowrap">
                    {fmt(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline History log */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className={cardBg}>
              <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-5">📋 Status Log</h3>
              
              <div className="space-y-4">
                {[...order.statusHistory].reverse().map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? "bg-gold ring-4 ring-gold/25" : "bg-[var(--text-secondary)]/30"}`} />
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{entry.status}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">
                        {new Date(entry.timestamp).toLocaleString("en-IN", { 
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
                        })}
                      </p>
                      {entry.note && <p className="text-[11px] text-[var(--text-secondary)]/80 mt-1 leading-relaxed">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Address, Payment and Actions */}
        <div className="space-y-6">
          
          {/* Shipping Address */}
          <div className={cardBg}>
            <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-4">📍 Shipping Address</h3>
            <p className="text-sm font-bold text-[var(--text-primary)]">{order.shippingAddress?.name}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-semibold">{order.shippingAddress?.phone}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              {order.shippingAddress?.line1}
              {order.shippingAddress?.area ? `, ${order.shippingAddress.area}` : ""}
              {order.shippingAddress?.landmark ? ` (${order.shippingAddress.landmark})` : ""}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
            </p>
          </div>

          {/* Payment Card */}
          <div className={cardBg}>
            <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-4">💳 Payment Details</h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Payment Mode</span>
                <span className="font-bold text-[var(--text-primary)] uppercase">{order.paymentMethod || "COD"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Payment Status</span>
                <span className={`font-bold capitalize ${
                  order.paymentStatus === "paid" ? "text-green-500" : order.paymentStatus === "refunded" ? "text-blue-500" : "text-yellow-500"
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
              
              {order.paymentDetails?.transactionId && (
                <div className="flex justify-between border-t border-[var(--card-border)]/5 pt-2 mt-2">
                  <span className="text-[var(--text-secondary)]">TXN ID</span>
                  <span className="font-mono text-[10px] text-[var(--text-primary)] truncate max-w-[120px]" title={order.paymentDetails.transactionId}>
                    {order.paymentDetails.transactionId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Price details summary */}
          <div className={cardBg}>
            <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-4">💰 Billing Summary</h3>
            
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[var(--text-primary)] font-bold">{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span className={order.shippingCost === 0 ? "text-green-500 font-bold" : "text-[var(--text-primary)] font-semibold"}>
                  {order.shippingCost === 0 ? "FREE" : fmt(order.shippingCost)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-500 font-semibold">
                  <span>Discount</span>
                  <span>-{fmt(order.discount)}</span>
                </div>
              )}
              {order.couponCode && (
                <div className="flex justify-between">
                  <span>Coupon</span>
                  <span className="text-gold font-bold">{order.couponCode}</span>
                </div>
              )}
              
              <div className="border-t border-[var(--card-border)] pt-2.5 mt-2 flex justify-between font-black text-sm text-[var(--text-primary)]">
                <span>Total Paid</span>
                <span className="text-gold font-bold text-base">{fmt(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Cancel/Return Actions */}
          <div className="space-y-3">
            {(order.orderStatus === "Processing" || order.orderStatus === "Confirmed") && (
              <button 
                onClick={handleCancel} 
                className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all"
              >
                Cancel Order
              </button>
            )}
            
            {order.returnEligible && (
              <button 
                onClick={() => setReturnModal(true)} 
                className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/25 transition-all"
              >
                🔄 Request Return ({order.returnDaysRemaining}d remaining)
              </button>
            )}
            
            <Link 
              to="/account" 
              className="block text-center text-xs font-bold text-gold hover:underline py-2 uppercase tracking-wider"
            >
              ← Back to My Orders
            </Link>
          </div>

        </div>
      </div>

      {/* Return Request Modal */}
      {returnModal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setReturnModal(false)}
        >
          <div 
            className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gold">Request Free Return</h3>
              <button onClick={() => setReturnModal(false)} className="text-white/40 hover:text-white"><XCircle size={16} /></button>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)]">
              Returns are completely free of charge. Full refunds are processed to your account immediately after approval.
            </p>
            
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)] mb-1">Reason for Return</label>
              <select 
                value={returnReason === "Other" || !["received different product", "received wrong product", "received defected product", "received wrong size", "received wrong color", ""].includes(returnReason) ? "Other" : returnReason} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === "Other") {
                    setReturnReason("Other");
                  } else {
                    setReturnReason(val);
                  }
                }} 
                className="w-full px-4 py-3 rounded-xl text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:border-gold"
              >
                <option value="">Select a reason</option>
                <option value="received different product">received different product</option>
                <option value="received wrong product">received wrong product</option>
                <option value="received defected product">received defected product</option>
                <option value="received wrong size">received wrong size</option>
                <option value="received wrong color">received wrong color</option>
                <option value="Other">Other (Please specify)</option>
              </select>
              
              {(returnReason === "Other" || !["received different product", "received wrong product", "received defected product", "received wrong size", "received wrong color", ""].includes(returnReason)) && (
                <input 
                  type="text"
                  placeholder="Please specify your reason..." 
                  value={returnReason === "Other" ? "" : returnReason}
                  onChange={e => setReturnReason(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:border-gold mt-2" 
                />
              )}
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button 
                onClick={() => setReturnModal(false)} 
                className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-wider flex-1"
              >
                Cancel
              </button>
              
              <button 
                onClick={handleRequestReturn} 
                disabled={submitting} 
                className="btn-gold flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border-0"
              >
                {submitting ? "Submitting..." : "Submit Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
