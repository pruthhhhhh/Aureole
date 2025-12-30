/**
 * Order Routes
 * API endpoints for order management
 */

const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  triggerDispense,
  confirmDispense,
  getStatus,
  cashPayment,
} = require('../controllers/orderController');

// Create Razorpay order
router.post('/create-order', createOrder);

// Cash payment (testing only)
router.post('/cash-payment', cashPayment);

// Verify payment
router.post('/verify-payment', verifyPayment);

// Trigger dispense (called by microcontroller)
router.post('/trigger-dispense', triggerDispense);

// Confirm dispense (called by microcontroller)
router.post('/confirm-dispense', confirmDispense);

// Get order status
router.get('/get-status/:orderId', getStatus);

module.exports = router;

