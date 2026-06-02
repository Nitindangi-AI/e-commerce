const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @desc    Get admin payment account details
// @route   GET /api/v1/payment/payment-account
// @access  Private/Admin
exports.getPaymentAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    paymentAccount: user.paymentAccount || {},
  });
});

// @desc    Update admin payment account details
// @route   PUT /api/v1/payment/payment-account
// @access  Private/Admin
exports.updatePaymentAccount = asyncHandler(async (req, res) => {
  const { upiId, bankName, accountHolder, accountNumber, ifscCode } = req.body;

  const user = await User.findById(req.user._id);

  user.paymentAccount = {
    upiId: upiId || user.paymentAccount.upiId || "",
    bankName: bankName || user.paymentAccount.bankName || "",
    accountHolder: accountHolder || user.paymentAccount.accountHolder || "",
    accountNumber: accountNumber || user.paymentAccount.accountNumber || "",
    ifscCode: ifscCode || user.paymentAccount.ifscCode || "",
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: "Payment account updated successfully",
    paymentAccount: user.paymentAccount,
  });
});
