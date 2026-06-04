import { useState } from "react";
import { Package, Copy, Check } from "lucide-react";
import { formatTrackingNumber } from "../utils/formatTracking";
import toast from "react-hot-toast";

export default function TrackingBadge({ number }) {
  const [copied, setCopied] = useState(false);
  const formatted = formatTrackingNumber(number);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    toast.success("Tracking number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="tracking-badge cursor-pointer"
      onClick={handleCopy}
      title="Click to copy tracking number"
    >
      <Package size={12} className="text-[var(--theme-gold)]" />
      <span className="tracking-badge__prefix">TRD</span>
      <span>-</span>
      <span>{formatted.replace(/^TRD-/, "")}</span>
      {copied ? (
        <Check size={10} className="text-green-500 ml-1" />
      ) : (
        <Copy size={10} className="opacity-40 hover:opacity-100 ml-1 transition-opacity" />
      )}
    </div>
  );
}
