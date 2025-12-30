/**
 * Order Controller
 * Handles order creation, payment verification, and dispensing
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const SystemStatus = require('../models/SystemStatus');

// Consumption rate: 1000 sprays per 100% capacity (0.1% per spray)
const SPRAY_CONSUMPTION_RATE = 0.1;

// Initialize Razorpay (with fallback for missing keys)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
  process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id' &&
  process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_key_secret') {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay initialized successfully');
} else {
  console.log('⚠️  Razorpay keys not configured. Payment features will not work.');
  console.log('   To enable payments, add your Razorpay keys to .env file');
}

/**
 * Create Razorpay Order
 * POST /api/create-order
 */
const createOrder = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please add Razorpay keys to backend/.env file',
        demo: true,
      });
    }

    // Extract values from request body
    const { amount, sprays = 1, perfumeId } = req.body;

    // Validate input
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum ₹1 required.',
      });
    }

    // Validate perfumeId
    if (!perfumeId || perfumeId < 1 || perfumeId > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid perfume ID. Must be between 1 and 12.',
      });
    }

    // Generate unique order ID
    const orderId = `PERFUME_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: orderId,
      notes: {
        sprays: sprays.toString(),
        orderId: orderId,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save order to database
    const order = new Order({
      razorpayOrderId: razorpayOrder.id,
      orderId: orderId,
      amount: amount,
      perfumeId: perfumeId,
      perfumeName: req.body.perfumeName || null,
      spraysRequested: sprays,
      pumpDurationMs: process.env.PUMP_DURATION_MS || 2000,
      paymentStatus: 'pending',
      dispensingStatus: 'pending',
    });

    await order.save();

    // Return order details
    res.status(200).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: amount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        name: 'Perfume Dispensing Machine',
        description: `${sprays} spray(s) of premium perfume`,
        prefill: {
          email: req.body.email || '',
          contact: req.body.contact || '',
        },
      },
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
};

/**
 * Cash Payment (Testing Only)
 * POST /api/cash-payment
 * Creates order and marks as paid immediately for testing
 */
const cashPayment = async (req, res) => {
  try {
    console.log('💵 Cash Payment Request Received');
    console.log('Request body:', JSON.stringify(req.body));
    console.log('Request headers:', JSON.stringify(req.headers));

    const { amount, sprays = 1, perfumeId } = req.body;

    // Ensure amount is a number
    const numAmount = Number(amount);
    const numSprays = Number(sprays) || 1;

    // Validate input
    if (!numAmount || numAmount < 1 || isNaN(numAmount)) {
      console.log('❌ Invalid amount:', numAmount);
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum ₹1 required.',
      });
    }

    // Validate perfumeId
    if (!perfumeId || perfumeId < 1 || perfumeId > 12) {
      console.log('❌ Invalid perfumeId:', perfumeId);
      return res.status(400).json({
        success: false,
        message: 'Invalid perfume ID. Must be between 1 and 12.',
      });
    }

    // Check for duplicate order (same amount, perfume, and recent timestamp within 5 seconds)
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const existingOrder = await Order.findOne({
      amount: numAmount,
      perfumeId: perfumeId,
      spraysRequested: numSprays,
      paymentStatus: 'completed',
      createdAt: { $gte: fiveSecondsAgo },
    }).sort({ createdAt: -1 });

    if (existingOrder) {
      console.log('⚠️ Duplicate order detected, returning existing order:', existingOrder.orderId);
      return res.status(200).json({
        success: true,
        message: 'Cash payment successful (Testing Mode)',
        data: {
          orderId: existingOrder.orderId,
          paymentStatus: 'completed',
          amount: numAmount,
          sprays: numSprays,
        },
      });
    }

    // Generate unique order ID
    const orderId = `CASH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('📦 Creating cash order:', orderId, 'Amount:', numAmount, 'Sprays:', numSprays);

    // Create order and mark as paid immediately
    const order = new Order({
      razorpayOrderId: `cash_${orderId}`,
      razorpayPaymentId: `cash_payment_${orderId}`,
      orderId: orderId,
      amount: numAmount,
      perfumeId: perfumeId,
      perfumeName: req.body.perfumeName || null,
      spraysRequested: numSprays,
      pumpDurationMs: process.env.PUMP_DURATION_MS || 2000,
      paymentStatus: 'completed',
      dispensingStatus: 'pending',
    });

    console.log('💾 Saving order to database...');
    await order.save();
    console.log('✅ Order saved successfully');

    // Update system statistics
    console.log('📊 Updating system statistics...');
    const systemStatus = await SystemStatus.getStatus();
    systemStatus.totalSales += 1;
    systemStatus.totalRevenue += numAmount;
    await systemStatus.save();
    console.log('✅ System statistics updated');

    // Return success response
    console.log('🎉 Cash payment successful, returning response');
    res.status(200).json({
      success: true,
      message: 'Cash payment successful (Testing Mode)',
      data: {
        orderId: orderId,
        paymentStatus: 'completed',
        amount: numAmount,
        sprays: numSprays,
      },
    });
  } catch (error) {
    console.error('❌ Cash Payment Error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Cash payment failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

/**
 * Verify Payment
 * POST /api/verify-payment
 */
const verifyPayment = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please add Razorpay keys to backend/.env file',
        demo: true,
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment details',
      });
    }

    // Find order in database
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // Payment verification failed
      order.paymentStatus = 'failed';
      order.errorMessage = 'Signature verification failed';
      await order.save();

      // Update system status
      const systemStatus = await SystemStatus.getStatus();
      systemStatus.failedTransactions += 1;
      await systemStatus.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Payment verified successfully
    order.paymentStatus = 'completed';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    await order.save();

    // Update system statistics
    const systemStatus = await SystemStatus.getStatus();
    systemStatus.totalSales += 1;
    systemStatus.totalRevenue += order.amount;
    await systemStatus.save();

    // Return success response
    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        amount: order.amount,
      },
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
};

/**
 * Trigger Dispense
 * POST /api/trigger-dispense
 * Called by frontend or microcontroller to trigger dispensing for a specific order
 */
const triggerDispense = async (req, res) => {
  try {
    console.log('🔔 Trigger Dispense Request:', req.body);
    const { orderId } = req.body;

    // Auto-set machine to online and update ping if it's a polling call from machine
    if (!orderId) {
      await SystemStatus.updateOne({}, {
        machineStatus: 'online',
        lastMicrocontrollerPing: new Date(),
        updatedAt: new Date()
      });
      console.log(`📡 Machine check-in: Online @ ${new Date().toLocaleTimeString()}`);
    }

    // Check system status for perfume level validation
    const systemStatus = await SystemStatus.getStatus();

    let order;

    // If orderId is provided, find that specific order
    if (orderId) {
      order = await Order.findOne({ orderId });

      if (!order) {
        console.log('❌ Order not found:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // Check if order is eligible for dispensing
      if (order.paymentStatus !== 'completed') {
        console.log(`❌ Payment not completed for order ${orderId}: ${order.paymentStatus}`);
        return res.status(400).json({
          success: false,
          message: 'Payment not completed for this order',
        });
      }

      if (order.dispensingStatus !== 'pending') {
        console.log(`❌ Order ${orderId} already ${order.dispensingStatus}`);
        return res.status(400).json({
          success: false,
          message: `Order already ${order.dispensingStatus}`,
        });
      }

      // Mark as authorized when user clicks the button
      console.log(`👆 User authorized dispense for order ${orderId}`);
      order.userAuthorized = true;
      await order.save();

      return res.json({
        success: true,
        message: 'Dispense authorized. Machine will pick it up shortly.',
        data: {
          orderId: order.orderId,
          dispensingStatus: order.dispensingStatus
        }
      });
    } else {
      // If no orderId, find oldest pending order (for microcontroller)
      order = await Order.findOne({
        paymentStatus: 'completed',
        dispensingStatus: 'pending',
        userAuthorized: true, // Only allow machine to see orders after manual trigger
      }).sort({ createdAt: 1 });

      if (!order) {
        console.log('⏳ No pending orders found');
        return res.json({
          success: true,
          hasOrder: false,
          message: 'No pending orders',
        });
      }
      console.log('📦 Found pending order:', order.orderId);
    }



    console.log('📊 System current state:', {
      machineStatus: systemStatus.machineStatus,
      perfumeLevelsSize: systemStatus.perfumeLevels?.size || 0,
    });

    // Check if machine is online (only for actual dispensing)
    if (systemStatus.machineStatus !== 'online') {
      console.log(`❌ Machine is ${systemStatus.machineStatus}, cannot dispense`);
      return res.json({
        success: false,
        hasOrder: false,
        message: 'Machine is offline or in maintenance',
      });
    }

    // Check perfume level for the specific perfume
    const perfumeId = order.perfumeId || 1;
    const perfumeIdStr = perfumeId.toString();

    // Get the specific perfume level - handle both Map and object formats
    let specificPerfumeLevel = 100;
    if (systemStatus.perfumeLevels) {
      if (systemStatus.perfumeLevels instanceof Map) {
        specificPerfumeLevel = systemStatus.perfumeLevels.get(perfumeIdStr) ?? 100;
      } else if (typeof systemStatus.perfumeLevels === 'object') {
        specificPerfumeLevel = systemStatus.perfumeLevels[perfumeIdStr] ?? 100;
      }
    }

    // Fallback to average if specific level not found - REMOVED faulty logic that overwrote 100% with average
    // if (specificPerfumeLevel === 100 && systemStatus.perfumeLevel) {
    //   specificPerfumeLevel = systemStatus.perfumeLevel;
    // }

    console.log(`🔍 Checking perfume ${perfumeId} level: ${specificPerfumeLevel}%`);

    if (specificPerfumeLevel < 10) {
      console.log(`❌ Low perfume level for perfume ${perfumeId}: ${specificPerfumeLevel}%`);
      order.dispensingStatus = 'failed';
      order.errorMessage = `Low perfume level for perfume ${perfumeId}`;
      await order.save();

      return res.json({
        success: false,
        hasOrder: false,
        message: `Low perfume level for perfume ${perfumeId}. Please refill.`,
      });
    }

    // Mark order as in progress ONLY if it's being picked up by the machine
    if (!orderId) {
      order.dispensingStatus = 'in_progress';
      console.log(`🚀 Order ${order.orderId} status changed to in_progress (Machine picked up)`);
    }

    order.dispenseTriggeredAt = new Date();
    await order.save();

    console.log(`✅ Order ${order.orderId} marked as in_progress, returning dispense command`);

    // Return dispense command
    res.json({
      success: true,
      hasOrder: true,
      message: 'Dispense command',
      data: {
        orderId: order.orderId,
        perfumeId: order.perfumeId,
        perfumeName: order.perfumeName,
        pumpDurationMs: order.pumpDurationMs,
        sprays: order.spraysRequested,
      },
    });
  } catch (error) {
    console.error('❌ Trigger Dispense Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger dispense',
      error: error.message,
    });
  }
};

/**
 * Confirm Dispense
 * POST /api/confirm-dispense
 * Called by microcontroller after successful dispensing
 */
const confirmDispense = async (req, res) => {
  try {
    console.log('📦 Confirm Dispense Request:', req.body);
    const { orderId, status = 'success', message } = req.body;

    if (!orderId) {
      console.log('❌ Order ID missing');
      return res.status(400).json({
        success: false,
        message: 'Order ID required',
      });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      console.log('❌ Order not found:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    console.log('📋 Found order:', order.orderId, 'Current status:', order.dispensingStatus);
    console.log('📋 Request status:', status);

    // Default to success if status is not provided or is 'success'
    const finalStatus = status || 'success';

    if (finalStatus === 'success') {
      // Dispensing completed successfully
      order.dispensingStatus = 'completed';
      order.microcontrollerAcknowledged = true;
      order.microcontrollerResponse = message || 'Dispense completed';
      order.dispenseCompletedAt = new Date();
      console.log('💾 Saving order as completed...');
      await order.save();
      console.log('✅ Order saved as completed');

      // Update non-critical system statistics AFTER the response is sent
      res.on('finish', async () => {
        try {
          console.log('📊 Updating system statistics (Background - Post-Finish)...');
          const systemStatus = await SystemStatus.getStatus();
          systemStatus.totalSpraysDispensed += (order.spraysRequested || 1);
          systemStatus.lastDispenseTime = new Date();

          // Update ONLY the specific perfume level that was dispensed
          const perfumeId = order.perfumeId || 1;
          const perfumeIdStr = perfumeId.toString();
          const sprays = order.spraysRequested || 1;

          // Ensure perfumeLevels Map is initialized
          if (!systemStatus.perfumeLevels || systemStatus.perfumeLevels.size === 0) {
            for (let i = 1; i <= 12; i++) {
              systemStatus.perfumeLevels.set(i.toString(), 100);
            }
          }

          // Get current level
          let currentLevel = 100;
          if (systemStatus.perfumeLevels instanceof Map) {
            currentLevel = systemStatus.perfumeLevels.get(perfumeIdStr) ?? 100;
          } else if (typeof systemStatus.perfumeLevels === 'object') {
            currentLevel = systemStatus.perfumeLevels[perfumeIdStr] ?? 100;
          }

          const newLevel = Math.max(0, currentLevel - (sprays * SPRAY_CONSUMPTION_RATE));
          const roundedLevel = Math.round(newLevel * 1000) / 1000;

          systemStatus.perfumeLevels.set(perfumeIdStr, roundedLevel);
          systemStatus.markModified('perfumeLevels');

          // Update average
          let total = 0;
          let count = 0;
          systemStatus.perfumeLevels.forEach((level) => {
            total += level;
            count++;
          });
          systemStatus.perfumeLevel = count > 0 ? total / count : 100;

          await systemStatus.save();
          console.log(`✅ Background Stats Update Complete. Perfume ${perfumeId} @ ${roundedLevel}%`);
        } catch (statsError) {
          console.error('⚠️ Background Statistics update failed:', statsError);
        }
      });

      // Send IMMEDIATE response to the machine
      return res.json({
        success: true,
        message: 'Dispense confirmed',
        data: {
          orderId: order.orderId,
          dispensingStatus: 'completed',
        },
      });
    } else {
      // Dispensing failed
      order.dispensingStatus = 'failed';
      order.microcontrollerAcknowledged = true;
      order.microcontrollerResponse = message || 'Dispense failed';
      order.errorMessage = message;
      await order.save();

      // Update system status safely
      try {
        const systemStatus = await SystemStatus.getStatus();
        systemStatus.failedTransactions += 1;
        systemStatus.lastError = message;
        systemStatus.lastErrorTime = new Date();
        await systemStatus.save();
      } catch (err) {
        console.error('⚠️ Failed to update failure stats:', err);
      }

      return res.json({
        success: false,
        message: 'Dispense failed',
      });
    }
  } catch (error) {
    console.error('Confirm Dispense Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm dispense',
      error: error.message,
    });
  }
};

/**
 * Get Order Status
 * GET /api/get-status/:orderId
 */
const getStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        dispensingStatus: order.dispensingStatus,
        amount: order.amount,
        createdAt: order.createdAt,
        dispenseTriggeredAt: order.dispenseTriggeredAt,
        dispenseCompletedAt: order.dispenseCompletedAt,
        errorMessage: order.errorMessage,
      },
    });
  } catch (error) {
    console.error('Get Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order status',
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  cashPayment,
  verifyPayment,
  triggerDispense,
  confirmDispense,
  getStatus,
};

