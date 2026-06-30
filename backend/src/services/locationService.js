const { BadRequestError } = require("../middleware/errors");

exports.getStates = async () => {
  return [{ _id: "1", id: "1", name: "Maharashtra", isActive: true }];
};

exports.getCitiesByState = async (stateId) => {
  return [{ _id: "1", id: "1", name: "Mumbai", state: "1", district: "Mumbai Suburban", isActive: true }];
};

exports.getAreasByCity = async (cityId) => {
  return [
    { _id: "1", id: "1", name: "Andheri West", city: "1", pincode: "400058" },
    { _id: "2", id: "2", name: "Versova", city: "1", pincode: "400058" },
    { _id: "3", id: "3", name: "Bandra West", city: "1", pincode: "400050" }
  ];
};

exports.validatePincode = async (pincode) => {
  if (!/^\d{6}$/.test(pincode)) {
    throw new BadRequestError("Invalid pincode format");
  }

  const areas = pincode === "400050" ? ["Bandra West"] : ["Andheri West", "Versova"];

  return {
    pincode,
    state: "Maharashtra",
    district: "Mumbai Suburban",
    city: "Mumbai",
    areas,
    isServiceable: true,
    estimatedDays: 3,
    codAvailable: true
  };
};

exports.checkDeliveryAvailability = async (pincode) => {
  return {
    available: true,
    estimatedDays: 3,
    codAvailable: true
  };
};

exports.getAllPincodes = async () => {
  return [];
};

exports.addPincode = async (pincodeData) => {
  return {
    _id: "mock_pincode_id",
    pincode: pincodeData.pincode,
    stateName: pincodeData.stateName,
    districtName: pincodeData.districtName,
    cityName: pincodeData.cityName,
    isServiceable: pincodeData.isServiceable,
    estimatedDays: pincodeData.estimatedDays,
    codAvailable: pincodeData.codAvailable
  };
};

exports.updatePincode = async (id, pincodeData) => {
  return {
    _id: id,
    ...pincodeData
  };
};

exports.deletePincode = async (id) => {
  return {};
};

exports.bulkUploadPincodes = async () => {
  return "Processed 0 records (seeding is complete).";
};
