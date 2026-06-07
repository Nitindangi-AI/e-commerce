const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const {
  sendRegistrationOTP,
  verifyOTPAndRegister,
  login,
  logout,
  forgotPasswordSendOTP,
  forgotPasswordReset,
  resendOTP,
  getProfile,
  updateProfile,
  sendPhoneVerifyOTP,
  verifyPhone,
  getSessions,
  revokeSession
} = require('../controllers/authController');

router.post('/send-otp', authLimiter, sendRegistrationOTP);
router.post('/verify-otp-register', authLimiter, verifyOTPAndRegister);
router.post('/login', authLimiter, login);
router.post('/logout', verifyToken, logout);
router.post('/forgot-password/send-otp', authLimiter, forgotPasswordSendOTP);
router.post('/forgot-password/reset', authLimiter, forgotPasswordReset);
router.post('/resend-otp', authLimiter, resendOTP);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);
router.post('/verify-phone/send', verifyToken, sendPhoneVerifyOTP);
router.post('/verify-phone/confirm', verifyToken, verifyPhone);
router.get('/sessions', verifyToken, getSessions);
router.delete('/sessions/:sessionId', verifyToken, revokeSession);

module.exports = router;
