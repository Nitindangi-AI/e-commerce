import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function OrderSuccessPage() {
  const [confetti, setConfetti] = useState(true);
  const location = useLocation();
  const order = location.state?.order;
  const orderId = order?.orderId || `TRENDZ${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => { setTimeout(() => setConfetti(false), 3000); }, []);

  const fmt = (p) => `₹${p?.toLocaleString("en-IN") || "0"}`;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center pt-24 px-6 text-center relative overflow-hidden">
      {confetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, background: ["#d4af37","#f5d26e","#fff","#4ade80"][i % 4], animationDelay: `${Math.random() * 2}s`, animationDuration: `${1 + Math.random() * 2}s`, opacity: 0.7 }} />
          ))}
        </div>
      )}
      <div className="animate-pop-in w-24 h-24 gold-bg rounded-full flex items-center justify-center text-5xl mb-8">✓</div>
      <h1 className="display text-4xl font-black mb-3">Order Placed!</h1>
      <p className="text-white/50 max-w-md mb-2">Your order has been confirmed and will be delivered soon.</p>
      <p className="text-white/30 text-sm mb-2">Order ID: <span className="gold font-mono">{orderId}</span></p>

      {order && (
        <div className="max-w-md w-full space-y-3 mb-8">
          {/* Order Summary */}
          <div className="bg-luxe-card border border-white/5 rounded-xl p-4 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Total Amount</span>
              <span className="gold font-bold">{fmt(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Payment</span>
              <span className="text-white/70 capitalize">{order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod?.toUpperCase()}</span>
            </div>
            {order.paymentMethod !== "cod" && order.paymentDetails?.transactionId && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/50">Transaction ID</span>
                <span className="text-white/70 font-mono text-xs">{order.paymentDetails.transactionId}</span>
              </div>
            )}
            {order.estimatedDelivery && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Expected Delivery</span>
                <span className="text-emerald-400 font-medium">{new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</span>
              </div>
            )}
          </div>

          {/* Payment Info for non-COD */}
          {order.paymentMethod !== "cod" && order.paymentDetails?.sellerAccountHolder && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 text-left">
              <p className="text-xs font-semibold text-gold mb-2">💰 Payment Routed To</p>
              <div className="space-y-1 text-xs text-white/60">
                <p><span className="text-white/40">Account:</span> {order.paymentDetails.sellerAccountHolder}</p>
                {order.paymentDetails.sellerUpiId && <p><span className="text-white/40">UPI:</span> {order.paymentDetails.sellerUpiId}</p>}
                {order.paymentDetails.sellerBankName && <p><span className="text-white/40">Bank:</span> {order.paymentDetails.sellerBankName}</p>}
              </div>
            </div>
          )}

          {/* Return Policy */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-left flex items-center gap-3">
            <span className="text-lg">🔄</span>
            <p className="text-xs text-emerald-400">5-Day Free Return Policy — no return shipping costs on any item.</p>
          </div>
        </div>
      )}

      {!order && <div className="mb-8" />}

      <div className="flex gap-4">
        <Link to="/shop" className="btn-gold px-8 py-3 rounded-full text-sm tracking-widest uppercase">Continue Shopping</Link>
        <Link to="/account" className="btn-outline px-8 py-3 rounded-full text-sm tracking-widest uppercase">My Orders</Link>
      </div>
    </div>
  );
}
