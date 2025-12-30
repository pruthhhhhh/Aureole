/**
 * Order Model
 * Stores payment orders, status, and dispensing information
 */

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Razorpay Order Details
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
  },
  razorpayPaymentId: {
    type: String,
    default: null,
  },
  razorpaySignature: {
    type: String,
    default: null,
  },

  // Order Information
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },

  // Dispensing Status
  dispensingStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending',
  },

  // Perfume Information
  perfumeId: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  perfumeName: {
    type: String,
    default: null,
  },

  // Pump Configuration
  spraysRequested: {
    type: Number,
    default: 1,
  },
  pumpDurationMs: {
    type: Number,
    default: 2000, // 2 seconds per spray
  },

  // Microcontroller Communication
  microcontrollerAcknowledged: {
    type: Boolean,
    default: false,
  },
  microcontrollerResponse: {
    type: String,
    default: null,
  },
  dispenseTriggeredAt: {
    type: Date,
    default: null,
  },
  dispenseCompletedAt: {
    type: Date,
    default: null,
  },
  userAuthorized: {
    type: Boolean,
    default: false,
  },

  // Error Handling
  errorMessage: {
    type: String,
    default: null,
  },
  retryCount: {
    type: Number,
    default: 0,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
orderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

