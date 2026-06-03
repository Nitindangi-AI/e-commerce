const mongoose = require('mongoose');

const deliverySlotSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    slot_time: { type: Date, required: true },
    is_reserved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Static helper to find slots for an order
deliverySlotSchema.statics.findByOrderId = function (orderId) {
  return this.find({ order: orderId }).sort({ slot_time: 1 });
};

module.exports = mongoose.model('DeliverySlot', deliverySlotSchema);
