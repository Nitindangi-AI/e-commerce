const mongoose = require("mongoose");

const serviceablePincodeSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stateName: {
      type: String,
      required: true,
    },
    districtName: {
      type: String,
      required: true,
    },
    cityName: {
      type: String,
      required: true,
    },
    isServiceable: {
      type: Boolean,
      default: true,
    },
    estimatedDays: {
      type: Number,
      default: 3,
    },
    codAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceablePincode", serviceablePincodeSchema);
