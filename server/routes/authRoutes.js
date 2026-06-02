const express = require("express");
const router = express.Router();
const { register, login, logout, getMe, updateProfile, updatePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { validateRegister, validateLogin } = require("../middleware/validate");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/logout", logout);
router.get("/me", protect, getMe);
router.put("/update-profile", protect, updateProfile);
router.put("/update-password", protect, updatePassword);

module.exports = router;
