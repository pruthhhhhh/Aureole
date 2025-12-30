/**
 * Authentication Controller
 * Handles admin login with hardcoded credentials
 */

const jwt = require('jsonwebtoken');

// Hardcoded Admin Credentials
// IMPORTANT: Change these credentials in production!
const ADMIN_CREDENTIALS = [
  {
    email: 'admin@aureole.com',
    password: 'Aureole@2025',
    name: 'Admin',
  },
  {
    email: 'pruthviracer007@gmail.com',
    password: 'Pruthvi@007',
    name: 'Pruthvi',
  },
  {
    email: 'zamasuhan95@gmail.com',
    password: 'suhan786lp',
    name: 'Suhan',
  },
  // Add more admins here as needed
  // {
  //   email: 'admin2@perfume.com',
  //   password: 'admin2password',
  //   name: 'Admin 2',
  // },
];

/**
 * Login
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find admin in hardcoded credentials
    const admin = ADMIN_CREDENTIALS.find(
      (cred) => cred.email.toLowerCase() === email.toLowerCase()
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify password
    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: admin.email,
        email: admin.email,
        name: admin.name,
        role: 'admin',
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          email: admin.email,
          name: admin.name,
          role: 'admin',
        },
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

/**
 * Verify Token
 * GET /api/auth/verify
 */
const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    // Verify admin exists in hardcoded credentials
    const admin = ADMIN_CREDENTIALS.find(
      (cred) => cred.email.toLowerCase() === decoded.email.toLowerCase()
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          email: admin.email,
          name: admin.name,
          role: 'admin',
        },
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = {
  login,
  verifyToken,
};

