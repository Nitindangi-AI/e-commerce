const mongoose = require('mongoose');

const shipmentEventSchema = new mongoose.Schema(
  {
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    status: { type: String, required: true },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

shipmentEventSchema.statics.findByShipmentId = function (shipmentId) {
  return this.find({ shipment: shipmentId }).sort({ timestamp: 1 });
};

shipmentEventSchema.statics.createEvent = function (data) {
  return this.create(data);
};

module.exports = mongoose.model('ShipmentEvent', shipmentEventSchema);
