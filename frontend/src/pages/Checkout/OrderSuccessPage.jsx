import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function OrderSuccessPage() {
  const [confetti, setConfetti] = useState(true);
  const location = useLocation();
  const order = location.state?.order;
  const orderId = order?.orderId || `LX-${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => { 
    const timer = setTimeout(() => setConfetti(false), 4000); 
    return () => clearTimeout(timer);
  }, []);

  const fmt = (p) => `₹${p?.toLocaleString("en-IN") || "0"}`;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center pt-24 px-6 text-center relative overflow-hidden bg-[var(--bg-gradient)] text-[var(--text-primary)]">
      
      {/* Self-contained CSS Animations */}
      <style>{`
        .checkmark-svg {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: block;
          stroke-width: 3;
          stroke: #C9A84C;
          stroke-miterlimit: 10;
          box-shadow: inset 0px 0px 0px #C9A84C;
          animation: fillCircle .4s ease-in-out .4s forwards, scaleCircle .3s ease-in-out .9s forwards;
          margin: 0 auto 2rem;
        }
        .checkmark-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 3;
          stroke-miterlimit: 10;
          stroke: #C9A84C;
          fill: none;
          animation: strokeCircle .6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .checkmark-check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          stroke: #C9A84C;
          animation: strokeCheck .3s cubic-bezier(0.65, 0, 0.45, 1) .8s forwards;
        }
        @keyframes strokeCircle {
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes strokeCheck {
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fillCircle {
          100% {
            box-shadow: inset 0px 0px 0px 45px rgba(201, 168, 76, 0.08);
          }
        }
        @keyframes scaleCircle {
          0%, 100% {
            transform: none;
          }
          50% {
            transform: scale3d(1.1, 1.1, 1);
          }
        }
      `}</style>

      {/* Confetti simulation */}
      {confetti && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {Array.from({ length: 40 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 60}%`, 
                background: ["#C9A84C", "#0A0A0A"][i % 2], 
                animationDelay: `${Math.random() * 1.5}s`, 
                animationDuration: `${1 + Math.random() * 1.5}s`, 
                opacity: 0.7 
              }} 
            />
          ))}
        </div>
      )}

      {/* Animated Checkmark SVG */}
      <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
        <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
      </svg>

      <h1 className="display text-4xl font-black mb-3">Order Placed Successfully!</h1>
      <p className="text-[var(--text-secondary)] max-w-md mb-2 text-sm">
        Your payment has been processed and your luxury purchase is confirmed.
      </p>
      
      <div className="mb-8">
        <p className="text-[var(--text-secondary)] text-sm">
          Order ID: <span className="font-mono font-bold text-gold uppercase tracking-wider">{orderId}</span>
        </p>
      </div>

      {order && (
        <div className="max-w-md w-full space-y-4 mb-10">
          {/* Order Brief Summary Card */}
          <div className="bg-luxe-card border border-[var(--card-border)] rounded-2xl p-5 text-left shadow-card space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex justify-between">
              <span>Total Paid</span>
              <span className="text-gold font-bold">{fmt(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Option</span>
              <span className="text-[var(--text-primary)] font-semibold uppercase">{order.paymentMethod || "COD"}</span>
            </div>
            
            {order.estimatedDelivery && (
              <div className="flex justify-between border-t border-[var(--card-border)] pt-2 mt-2">
                <span>Estimated Delivery</span>
                <span className="text-green-500 font-bold">
                  {new Intl.DateTimeFormat("en-IN", { 
                    weekday: "short", month: "short", day: "numeric" 
                  }).format(new Date(order.estimatedDelivery))}
                </span>
              </div>
            )}
          </div>

          {/* Return notice policy */}
          <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4 text-left flex items-center gap-3">
            <span className="text-lg">🔄</span>
            <p className="text-xs text-green-600 font-medium">
              5-Day Returns: You can cancel or request returns within 5 days of delivery.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link 
          to="/shop" 
          className="w-48 btn-gold py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-center border-0"
        >
          Continue Shopping
        </Link>
        
        {order?.id ? (
          <Link 
            to={`/orders/${order.id}`} 
            className="w-48 px-6 py-3 rounded-xl border border-[var(--card-border)] hover:border-gold text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center transition-all"
          >
            View Order
          </Link>
        ) : (
          <Link 
            to="/account" 
            className="w-48 px-6 py-3 rounded-xl border border-[var(--card-border)] hover:border-gold text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center transition-all"
          >
            My Account
          </Link>
        )}
      </div>
    </div>
  );
}
