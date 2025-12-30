/**
 * System Routes
 * API endpoints for system status and statistics
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getSystemStatus,
  updateSystemStatus,
  getStatistics,
  getRecentOrders,
  clearAllOrders,
} = require('../controllers/systemController');

// Get system status (public for microcontroller, protected for admin)
router.get('/status', getSystemStatus);

// Update system status (called by microcontroller)
router.put('/status', updateSystemStatus);

// Get statistics (public for now, can add auth later)
router.get('/statistics', getStatistics);

// Get recent orders (public for now, can add auth later)
router.get('/orders', getRecentOrders);

// Clear all orders (admin operation)
router.delete('/clear-orders', clearAllOrders);

module.exports = router;

