// Stub repository as locations currently use static mock responses.

exports.getAllPincodes = async () => {
  return [];
};

exports.addPincode = async (pincodeData) => {
  return pincodeData;
};

exports.updatePincode = async (id, pincodeData) => {
  return { id, ...pincodeData };
};

exports.deletePincode = async (id) => {
  return {};
};
