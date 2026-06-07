const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

async function hashOTP(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOTP(otp, hash) {
  return bcrypt.compare(otp, hash);
}

module.exports = { generateOTP, hashOTP, verifyOTP };
