const twilio = require('twilio');

async function sendOTPSMS(phone, otp) {
  // If credentials are not set, log and skip (allows mock development fallback)
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.log(`[Twilio Mock] SMS sent to ${phone}: verification code is ${otp}`);
    return;
  }
  
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone;
  
  await client.messages.create({
    body: `Your Trendy verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: formattedPhone
  });
}

module.exports = { sendOTPSMS };
