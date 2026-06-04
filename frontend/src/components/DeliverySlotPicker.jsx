import { useState } from "react";
import { Clock } from "lucide-react";

export default function DeliverySlotPicker({ selectedSlot, onChange }) {
  // 4 standard slots always available
  const slots = [
    { id: "slot1", time: "09:00 AM - 12:00 PM", label: "Morning Delivery", booked: false },
    { id: "slot2", time: "12:00 PM - 03:00 PM", label: "Afternoon Delivery", booked: true }, // marked as booked for demonstration
    { id: "slot3", time: "03:00 PM - 06:00 PM", label: "Evening Delivery", booked: false },
    { id: "slot4", time: "06:00 PM - 09:00 PM", label: "Night Delivery", booked: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={16} className="text-[var(--theme-gold)]" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          Select Preferred Delivery Slot
        </span>
      </div>

      <div className="delivery-slot-grid">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          const isBooked = slot.booked;

          return (
            <button
              key={slot.id}
              type="button"
              disabled={isBooked}
              onClick={() => !isBooked && onChange(slot.id)}
              className={`delivery-slot ${
                isBooked 
                  ? "delivery-slot--booked text-red-500/40 border-red-500/10" 
                  : isSelected
                    ? "delivery-slot--selected text-white"
                    : "text-[var(--text-primary)]"
              }`}
            >
              <span className="delivery-slot__time">{slot.time}</span>
              <span className="delivery-slot__label">{slot.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
