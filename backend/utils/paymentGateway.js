/**
 * Payment Abstraction Layer
 * Abstracts payment gateway operations and supports future Razorpay / Stripe integrations.
 */

/**
 * Process a mock payment transaction.
 * @param {Object} params
 * @param {number} params.amount - Amount in INR
 * @param {string} params.method - Payment method ('cod', 'card', 'upi', etc.)
 * @param {string} params.orderId - Unique order ID
 * @returns {Promise<Object>} Processed payment details
 */
exports.processMockPayment = async ({ amount, method, orderId }) => {
  // COD payments do not require gateway transaction processing
  if (method === 'cod') {
    return {
      success: true,
      transactionId: null,
      status: 'pending',
      gateway: 'none',
      message: 'Cash on delivery order initialized'
    };
  }

  // Abstract online payment processing (Card, UPI, Netbanking)
  // Can be swapped out for Razorpay or Stripe SDK calls in the future
  const transactionId = `pay_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  
  return {
    success: true,
    transactionId,
    status: 'paid',
    gateway: 'mock_gateway', // Swap to 'razorpay' or 'stripe' in production
    message: 'Online payment simulated successfully'
  };
};
