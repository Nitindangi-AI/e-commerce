const { body, validationResult } = require("express-validator");

// Check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// Registration validation
const validateRegister = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  handleValidationErrors,
];

// Login validation
const validateLogin = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

// Product validation
const validateProduct = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("price").isNumeric().withMessage("Price must be a number"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("brand").trim().notEmpty().withMessage("Brand is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a positive number"),
  handleValidationErrors,
];

// Review validation
const validateReview = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("title").trim().notEmpty().withMessage("Review title is required"),
  body("text").trim().notEmpty().withMessage("Review text is required"),
  handleValidationErrors,
];

// Address validation
const validateAddress = [
  body("name").trim().notEmpty().withMessage("Full name is required").escape(),
  body("phone")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid 10-digit Indian mobile number"),
  body("country").trim().notEmpty().withMessage("Country is required").escape(),
  body("state").trim().notEmpty().withMessage("State is required").escape(),
  body("district").trim().notEmpty().withMessage("District is required").escape(),
  body("city").trim().notEmpty().withMessage("City is required").escape(),
  body("area").trim().notEmpty().withMessage("Area/Locality is required").escape(),
  body("landmark").optional().trim().escape(),
  body("line1").trim().notEmpty().withMessage("Full Address Line is required").escape(),
  body("pincode")
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Enter a valid 6-digit pincode"),
  body("label")
    .optional()
    .isIn(["Home", "Work", "Other"])
    .withMessage("Invalid address type"),
  handleValidationErrors,
];

// Order validation
const validateOrder = [
  body("orderItems")
    .isArray({ min: 1 })
    .withMessage("Order items must be a non-empty array"),
  body("orderItems.*.product")
    .isUUID()
    .withMessage("Product ID must be a valid UUID"),
  body("orderItems.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("shippingAddress")
    .isObject()
    .withMessage("Shipping address must be an object"),
  body("shippingAddress.name")
    .trim()
    .notEmpty()
    .withMessage("Recipient name is required"),
  body("shippingAddress.phone")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Recipient phone must be a valid 10-digit number"),
  body("shippingAddress.line1")
    .trim()
    .notEmpty()
    .withMessage("Address Line 1 is required"),
  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),
  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),
  body("shippingAddress.pincode")
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Pincode must be a 6-digit number"),
  body("paymentMethod")
    .isIn(["cod", "upi", "card", "netbanking"])
    .withMessage("Invalid payment method"),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateReview,
  validateAddress,
  validateOrder,
};

