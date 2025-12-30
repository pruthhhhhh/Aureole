/**
 * System Controller
 * Handles system status, statistics, and admin operations
 */

const SystemStatus = require('../models/SystemStatus');
const Order = require('../models/Order');

/**
 * Get System Status
 * GET /api/system/status
 */
const getSystemStatus = async (req, res) => {
  try {
    const status = await SystemStatus.getStatus();

    // Get recent orders count
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    });

    // Convert to plain object to ensure Map is serialized correctly
    const statusObj = status.toJSON ? status.toJSON() : status.toObject();

    res.json({
      success: true,
      data: {
        ...statusObj,
        recentOrders24h: recentOrders,
      },
    });
  } catch (error) {
    console.error('Get System Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system status',
      error: error.message,
    });
  }
};

/**
 * Update System Status
 * PUT /api/system/status
 * Called by microcontroller to update machine status
 */
const updateSystemStatus = async (req, res) => {
  try {
    const { machineStatus, perfumeLevel, perfumeLevels } = req.body;
    console.log('📥 Update System Status Request:', { machineStatus, perfumeLevel, perfumeLevels });

    const status = await SystemStatus.getStatus();

    if (machineStatus) {
      status.machineStatus = machineStatus;
    }

    // Update individual perfume levels if provided
    if (perfumeLevels && typeof perfumeLevels === 'object' && !Array.isArray(perfumeLevels)) {
      console.log('📊 Updating perfume levels:', JSON.stringify(perfumeLevels));

      // Ensure perfumeLevels Map is initialized
      if (!status.perfumeLevels || status.perfumeLevels.size === 0) {
        console.log('⚠️ perfumeLevels Map not initialized, initializing all 12 perfumes to 100%');
        for (let i = 1; i <= 12; i++) {
          status.perfumeLevels.set(i.toString(), 100);
        }
      }

      // Get current levels before update for logging
      const beforeUpdate = {};
      status.perfumeLevels.forEach((value, key) => {
        beforeUpdate[key] = value;
      });

      // Only update the specific perfume levels provided, don't touch others
      Object.keys(perfumeLevels).forEach((perfumeId) => {
        try {
          const level = Math.max(0, Math.min(100, Number(perfumeLevels[perfumeId])));
          const perfumeIdStr = perfumeId.toString();
          const oldLevel = status.perfumeLevels.get(perfumeIdStr) ?? 100;

          // Only update this specific perfume, leave all others unchanged
          status.perfumeLevels.set(perfumeIdStr, level);
          console.log(`✅ Updated ONLY perfume ${perfumeIdStr}: ${oldLevel.toFixed(1)}% → ${level.toFixed(1)}%`);
        } catch (err) {
          console.error(`❌ Error updating perfume ${perfumeId}:`, err);
        }
      });

      // Verify other perfumes are unchanged
      const afterUpdate = {};
      status.perfumeLevels.forEach((value, key) => {
        afterUpdate[key] = value;
      });

      // Log any unexpected changes
      Object.keys(beforeUpdate).forEach((key) => {
        if (!perfumeLevels[key] && beforeUpdate[key] !== afterUpdate[key]) {
          console.warn(`⚠️ WARNING: Perfume ${key} changed unexpectedly: ${beforeUpdate[key]}% → ${afterUpdate[key]}%`);
        }
      });

      // Recalculate average based on all perfume levels
      let total = 0;
      let count = 0;
      status.perfumeLevels.forEach((level) => {
        total += level;
        count++;
      });
      status.perfumeLevel = count > 0 ? total / count : 100;

      // CRITICAL: Explicitly tell Mongoose that the Map has changed
      status.markModified('perfumeLevels');
    } else if (perfumeLevel !== undefined) {
      // Legacy: update average perfume level (but don't change individual levels)
      status.perfumeLevel = Math.max(0, Math.min(100, perfumeLevel));
    }

    status.lastMicrocontrollerPing = new Date();
    await status.save();

    console.log('✅ System status saved successfully');

    // Return the updated status with proper serialization
    const statusObj = status.toJSON ? status.toJSON() : status.toObject();

    res.json({
      success: true,
      message: 'System status updated',
      data: statusObj,
    });
  } catch (error) {
    console.error('❌ Update System Status Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update system status',
      error: error.message,
    });
  }
};

/**
 * Get Statistics
 * GET /api/system/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const status = await SystemStatus.getStatus();

    // Use aggregation to get counts in a single query
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$dispensingStatus", "completed"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$dispensingStatus", "failed"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$dispensingStatus", "pending"] }, 1, 0] } }
        }
      }
    ]);

    const stats = orderStats[0] || { total: 0, completed: 0, failed: 0, pending: 0 };

    // Get revenue by date (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyRevenue: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const revenueByDate = {};
    recentRevenue.forEach(item => {
      revenueByDate[item._id] = item.dailyRevenue;
    });

    res.json({
      success: true,
      data: {
        systemStatus: status,
        orders: stats,
        revenueByDate: revenueByDate,
      },
    });
  } catch (error) {
    console.error('Get Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message,
    });
  }
};

/**
 * Get Recent Orders
 * GET /api/system/orders
 */
const getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-razorpaySignature');

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Get Recent Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent orders',
      error: error.message,
    });
  }
};

/**
 * Clear All Orders
 * DELETE /api/system/clear-orders
 * Deletes all orders and resets statistics
 */
const clearAllOrders = async (req, res) => {
  try {
    console.log('🗑️  Clearing all orders...');

    // Count orders before deletion
    const orderCount = await Order.countDocuments();
    console.log(`Found ${orderCount} orders to delete`);

    // Delete all orders
    const deleteResult = await Order.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} orders`);

    // Reset system statistics
    const status = await SystemStatus.getStatus();
    status.totalSales = 0;
    status.totalRevenue = 0;
    status.totalSpraysDispensed = 0;
    status.failedTransactions = 0;
    status.lastDispenseTime = null;
    status.lastError = null;
    status.lastErrorTime = null;
    await status.save();
    console.log('✅ System statistics reset');

    res.json({
      success: true,
      message: `Successfully cleared ${deleteResult.deletedCount} orders and reset statistics`,
      data: {
        deletedCount: deleteResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Clear All Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear orders',
      error: error.message,
    });
  }
};

module.exports = {
  getSystemStatus,
  updateSystemStatus,
  getStatistics,
  getRecentOrders,
  clearAllOrders,
};

