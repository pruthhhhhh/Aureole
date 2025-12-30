/**
 * Create Admin User Script
 * Run this to create the first admin user
 * 
 * Usage: node scripts/createAdmin.js <email> <password>
 * Example: node scripts/createAdmin.js admin@example.com admin123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get email and password from command line arguments
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.error('❌ Error: Email and password are required');
      console.log('\nUsage: node scripts/createAdmin.js <email> <password>');
      console.log('Example: node scripts/createAdmin.js admin@example.com admin123');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('❌ Error: Password must be at least 6 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      console.log('⚠️  User with this email already exists');
      console.log('   Email:', existingUser.email);
      console.log('   Role:', existingUser.role);
      process.exit(0);
    }

    // Create admin user
    const user = new User({
      email: email.toLowerCase(),
      password,
      role: 'admin',
    });

    await user.save();

    console.log('✅ Admin user created successfully!');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('\n📝 You can now login with these credentials');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();

