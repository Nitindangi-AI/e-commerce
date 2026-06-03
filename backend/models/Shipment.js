const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    tracking_number: { type: String, required: true, unique: true },
    carrier: { type: String, default: 'Trendy Express' },
    status: {
      type: String,
      default: 'pending',
      enum: [
        'pending',
        'pickup_scheduled',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'returned',
      ],
    },
    current_location: { type: String, default: '' },
    estimated_delivery: { type: Date },
    actual_delivery: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Static helper methods
shipmentSchema.statics.findByOrderId = function (orderId) {
  return this.findOne({ order: orderId });
};

shipmentSchema.statics.findByTrackingNumber = function (trackingNumber) {
  return this.findOne({ tracking_number: trackingNumber });
};

shipmentSchema.statics.updateStatus = function (id, status, location, estimatedDelivery) {
  const update = { status };
  if (location !== undefined) update.current_location = location;
  if (estimatedDelivery !== undefined) update.estimated_delivery = estimatedDelivery;
  update.updated_at = new Date();
  return this.findByIdAndUpdate(id, update, { new: true });
};

shipmentSchema.statics.createShipment = function (data) {
  return this.create(data);
};

module.exports = mongoose.model('Shipment', shipmentSchema);
