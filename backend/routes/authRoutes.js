/**
 * Authentication Routes
 * API endpoints for admin authentication
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  login,
  verifyToken,
} = require('../controllers/authController');

// Login
router.post('/login', login);

// Verify token
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;

