const nodemailer = require('nodemailer');

async function sendOrderConfirmationEmail(email, order, items) {
  // Graceful fallback for mock/local development when SMTP is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
    console.log(`[SMTP Mock] Order Confirmation Email sent to ${email} for Order ${order.order_number || order.id}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || 587, 10),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const itemsHtml = items.map(item => `
      <li>${item.name} (Qty: ${item.quantity}) - ₹${item.price}</li>
    `).join('');

    await transporter.sendMail({
      from: '"Trendy Fashion" <noreply@trendy.in>',
      to: email,
      subject: `Order Confirmation - ${order.order_number || order.id}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
          <h1 style="font-family:Georgia,serif;color:#0A0A0A;font-size:28px;margin-bottom:8px">TRENDY</h1>
          <h2 style="color:#0A0A0A;font-size:20px">Thank you for your order!</h2>
          <p style="color:#666;font-size:14px">Your order has been received and is being processed.</p>
          <p style="font-size:14px"><strong>Order Number:</strong> ${order.order_number || order.id}</p>
          <p style="font-size:14px"><strong>Total Amount:</strong> ₹${order.total_amount}</p>
          <h3 style="color:#0A0A0A;font-size:16px;margin-top:24px">Items:</h3>
          <ul>
            ${itemsHtml}
          </ul>
        </div>
      `
    });
  } catch (err) {
    console.error("Failed to send order confirmation email:", err);
  }
}

async function sendVendorOrderNotificationEmail(vendorEmail, order, items) {
  // Graceful fallback for mock/local development when SMTP is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
    console.log(`[SMTP Mock] Vendor Order Notification Email sent to ${vendorEmail} for Order ${order.order_number || order.id}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || 587, 10),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const itemsHtml = items.map(item => `
      <li>${item.name} (Qty: ${item.quantity}) - ₹${item.price}</li>
    `).join('');

    await transporter.sendMail({
      from: '"Trendy Fashion Store" <noreply@trendy.in>',
      to: vendorEmail,
      subject: `New Order Received - ${order.order_number || order.id}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
          <h1 style="font-family:Georgia,serif;color:#0A0A0A;font-size:28px;margin-bottom:8px">TRENDY VENDOR</h1>
          <h2 style="color:#0A0A0A;font-size:20px">You have received a new order!</h2>
          <p style="font-size:14px"><strong>Order Number:</strong> ${order.order_number || order.id}</p>
          <h3 style="color:#0A0A0A;font-size:16px;margin-top:24px">Your Items:</h3>
          <ul>
            ${itemsHtml}
          </ul>
        </div>
      `
    });
  } catch (err) {
    console.error("Failed to send vendor order notification email:", err);
  }
}

module.exports = { sendOrderConfirmationEmail, sendVendorOrderNotificationEmail };
