/**
 * Main Server File
 * Express.js server for Perfume Dispensing Machine API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const systemRoutes = require('./routes/systemRoutes');
const authRoutes = require('./routes/authRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Allow all origins for easier integration with Vercel frontend
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log all registered routes for debugging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', orderRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Export app for serverless environments (like Vercel)
module.exports = app;

// Start server only if not being required as a module
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  const startServer = async () => {
    try {
      // Connect to database
      await connectDB();

      // Start listening on all interfaces (0.0.0.0) to allow network access
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);

        // Check Razorpay configuration
        if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
          process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id' &&
          process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_key_secret') {
          console.log(`💳 Razorpay: Configured ✅`);
        } else {
          console.log(`💳 Razorpay: Not configured ⚠️  (Payment features disabled)`);
        }

        console.log(`\n📱 Frontend: http://localhost:${PORT}`);
        console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

