const asyncHandler = require("express-async-handler");
const ServiceablePincode = require("../models/ServiceablePincode");
const Area = require("../models/Area");
const City = require("../models/City");
const State = require("../models/State");

// @desc    Get all serviceable pincodes (Admin)
// @route   GET /api/v1/locations/admin/pincodes
// @access  Private/Admin
exports.getAllPincodes = asyncHandler(async (req, res) => {
  const pincodes = await ServiceablePincode.find().sort({ pincode: 1 });
  res.status(200).json({ success: true, count: pincodes.length, pincodes });
});

// @desc    Add a serviceable pincode (Admin)
// @route   POST /api/v1/locations/admin/pincodes
// @access  Private/Admin
exports.addPincode = asyncHandler(async (req, res) => {
  const { pincode, stateName, districtName, cityName, isServiceable, estimatedDays, codAvailable } = req.body;

  const existing = await ServiceablePincode.findOne({ pincode });
  if (existing) {
    return res.status(400).json({ success: false, message: "Pincode already exists" });
  }

  const newPincode = await ServiceablePincode.create({
    pincode,
    stateName,
    districtName,
    cityName,
    isServiceable,
    estimatedDays,
    codAvailable,
  });

  res.status(201).json({ success: true, pincode: newPincode });
});

// @desc    Update a serviceable pincode (Admin)
// @route   PUT /api/v1/locations/admin/pincodes/:id
// @access  Private/Admin
exports.updatePincode = asyncHandler(async (req, res) => {
  const pincode = await ServiceablePincode.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!pincode) {
    return res.status(404).json({ success: false, message: "Pincode not found" });
  }

  res.status(200).json({ success: true, pincode });
});

// @desc    Delete a serviceable pincode (Admin)
// @route   DELETE /api/v1/locations/admin/pincodes/:id
// @access  Private/Admin
exports.deletePincode = asyncHandler(async (req, res) => {
  const pincode = await ServiceablePincode.findById(req.params.id);

  if (!pincode) {
    return res.status(404).json({ success: false, message: "Pincode not found" });
  }

  await pincode.remove();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Bulk upload pincodes (Admin)
// @route   POST /api/v1/locations/admin/pincodes/bulk
// @access  Private/Admin
exports.bulkUploadPincodes = asyncHandler(async (req, res) => {
  // Simple custom CSV parser since we avoided multer/csvtojson due to network errors
  const { csvData } = req.body;
  
  if (!csvData) {
    return res.status(400).json({ success: false, message: "CSV data is required" });
  }

  const lines = csvData.split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ success: false, message: "Invalid CSV format or empty" });
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const expectedHeaders = ['pincode', 'state', 'district', 'city', 'area', 'isserviceable', 'estimateddays', 'codavailable'];
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Missing required headers: ${missingHeaders.join(', ')}` 
    });
  }

  let successCount = 0;
  let errors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle basic CSV splitting (doesn't perfectly handle commas inside quotes, but good enough for simple locations)
    const values = line.split(',').map(v => v.trim());
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    try {
      const pincode = row.pincode;
      if (!pincode || !/^\d{6}$/.test(pincode)) {
        errors.push(`Row ${i+1}: Invalid pincode ${pincode}`);
        continue;
      }

      // Update or create ServiceablePincode
      await ServiceablePincode.findOneAndUpdate(
        { pincode },
        {
          pincode,
          stateName: row.state,
          districtName: row.district,
          cityName: row.city,
          isServiceable: row.isserviceable.toLowerCase() === 'true' || row.isserviceable === '1',
          estimatedDays: parseInt(row.estimateddays) || 3,
          codAvailable: row.codavailable.toLowerCase() === 'true' || row.codavailable === '1',
        },
        { upsert: true, new: true }
      );

      // We should also manage States, Cities, Areas based on this data
      let stateObj = await State.findOne({ name: row.state });
      if (!stateObj) {
        stateObj = await State.create({ name: row.state });
      }

      let cityObj = await City.findOne({ name: row.city, state: stateObj._id });
      if (!cityObj) {
        cityObj = await City.create({ name: row.city, state: stateObj._id, district: row.district });
      }

      // Add Area
      if (row.area) {
        await Area.findOneAndUpdate(
          { name: row.area, city: cityObj._id, pincode },
          { name: row.area, city: cityObj._id, pincode },
          { upsert: true }
        );
      }

      successCount++;
    } catch (err) {
      errors.push(`Row ${i+1}: ${err.message}`);
    }
  }

  res.status(200).json({
    success: true,
    message: `Processed ${successCount} records.`,
    errors: errors.length > 0 ? errors : undefined
  });
});
