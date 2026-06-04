import { useEffect, useState } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function ReturnWindowBanner({ order }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState("expired"); // "eligible", "expiring", "expired"

  useEffect(() => {
    if (!order) return;

    // Find return policy days from items or default to 5
    let returnDays = 5;
    if (order.orderItems && order.orderItems.length > 0) {
      const days = order.orderItems.map((item) => item.returnDays || 5);
      returnDays = Math.max(...days);
    }

    const createdAt = new Date(order.createdAt);
    const returnWindowMs = returnDays * 24 * 60 * 60 * 1000;
    const expiryTime = createdAt.getTime() + returnWindowMs;

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setStatus("expired");
        return;
      }

      // Format remaining time
      const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      let text = "";
      if (daysLeft > 0) {
        text += `${daysLeft}d ${hoursLeft}h`;
      } else {
        text += `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
      }
      setTimeLeft(text);

      // Determine status style
      if (daysLeft >= 2) {
        setStatus("eligible");
      } else {
        setStatus("expiring");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

  if (order.orderStatus !== "Delivered") return null;

  return (
    <div className={`return-window-banner return-window-banner--${status} animate-theme-fade-in`}>
      <RotateCcw size={16} />
      <div className="flex-1">
        <span className="font-bold uppercase tracking-wider mr-1">
          {status === "expired" ? "Return Period Expired" : "Return Period Active"}
        </span>
        <span className="opacity-60 text-[10px]">
          ({order.orderStatus === "Delivered" ? "Policy from order date" : ""})
        </span>
      </div>
      {status !== "expired" && (
        <div className="return-window-countdown flex items-center gap-1 font-mono font-black">
          {status === "expiring" && <AlertTriangle size={12} className="text-orange-500 animate-pulse" />}
          <span>{timeLeft} left</span>
        </div>
      )}
    </div>
  );
}
