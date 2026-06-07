const nodemailer = require('nodemailer');

async function sendOTPEmail(email, otp, purpose) {
  const subjects = {
    register: 'Verify your Trendy account',
    forgot_password: 'Reset your Trendy password',
    email_verify: 'Confirm your email — Trendy'
  };

  // Graceful fallback for mock/local development when SMTP is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
    console.log(`[SMTP Mock] Email sent to ${email} for purpose ${purpose}: verification code is ${otp}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || 587, 10),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  await transporter.sendMail({
    from: '"Trendy Fashion" <noreply@trendy.in>',
    to: email,
    subject: subjects[purpose] || 'Your Trendy OTP',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
        <h1 style="font-family:Georgia,serif;color:#0A0A0A;font-size:28px;margin-bottom:8px">TRENDY</h1>
        <p style="color:#666;font-size:14px;margin-bottom:32px">Premium Fashion Store</p>
        <h2 style="color:#0A0A0A;font-size:20px">Your verification code</h2>
        <div style="background:#FFF8E7;border:2px solid #C9A84C;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0A0A0A">${otp}</span>
        </div>
        <p style="color:#666;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:32px 0">
        <p style="color:#999;font-size:11px">If you did not request this code, ignore this email.</p>
      </div>
    `
  });
}

module.exports = { sendOTPEmail };
