const mongoose = require("mongoose");

const areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    pincode: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure area name is unique per city and pincode
areaSchema.index({ name: 1, city: 1, pincode: 1 }, { unique: true });

module.exports = mongoose.model("Area", areaSchema);
