/**
 * System Status Model
 * Tracks machine state, perfume level, and statistics
 */

const mongoose = require('mongoose');

const systemStatusSchema = new mongoose.Schema({
  // Perfume Level (percentage 0-100) - Legacy field for backward compatibility
  perfumeLevel: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },

  // Individual Perfume Levels (1-12)
  perfumeLevels: {
    type: Map,
    of: {
      type: Number,
      min: 0,
      max: 100,
    },
    default: () => {
      const levels = new Map();
      // Initialize all 12 perfumes to 100%
      for (let i = 1; i <= 12; i++) {
        levels.set(i.toString(), 100);
      }
      return levels;
    },
  },

  // Machine Status
  machineStatus: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'error'],
    default: 'offline',
  },

  // Statistics
  totalSales: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  totalSpraysDispensed: {
    type: Number,
    default: 0,
  },
  failedTransactions: {
    type: Number,
    default: 0,
  },

  // Last Update
  lastMicrocontrollerPing: {
    type: Date,
    default: null,
  },
  lastDispenseTime: {
    type: Date,
    default: null,
  },

  // Error Log
  lastError: {
    type: String,
    default: null,
  },
  lastErrorTime: {
    type: Date,
    default: null,
  },

  // Timestamps
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
systemStatusSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Convert Map to Object when serializing to JSON
systemStatusSchema.methods.toJSON = function () {
  const obj = this.toObject();
  // Convert perfumeLevels Map to plain object
  if (this.perfumeLevels && this.perfumeLevels instanceof Map) {
    const levelsObj = {};
    this.perfumeLevels.forEach((value, key) => {
      levelsObj[key] = value;
    });
    obj.perfumeLevels = levelsObj;
  } else if (!obj.perfumeLevels || Object.keys(obj.perfumeLevels).length === 0) {
    // Initialize if missing - ensure all 12 perfumes are present
    obj.perfumeLevels = {};
    for (let i = 1; i <= 12; i++) {
      obj.perfumeLevels[i.toString()] = 100;
    }
  }
  return obj;
};

// Singleton pattern - only one system status document
systemStatusSchema.statics.getStatus = async function () {
  let status = await this.findOne();
  if (!status) {
    status = await this.create({});
  }
  
  // Ensure perfumeLevels map is initialized with all 12 perfumes
  let needsSave = false;
  for (let i = 1; i <= 12; i++) {
    const perfumeIdStr = i.toString();
    if (!status.perfumeLevels.has(perfumeIdStr)) {
      status.perfumeLevels.set(perfumeIdStr, 100);
      needsSave = true;
    }
  }
  
  if (needsSave) {
    await status.save();
  }
  
  // Calculate average perfume level for backward compatibility
  if (status.perfumeLevels && status.perfumeLevels.size > 0) {
    let total = 0;
    let count = 0;
    status.perfumeLevels.forEach((level) => {
      total += level;
      count++;
    });
    status.perfumeLevel = count > 0 ? total / count : 100;
  }
  
  return status;
};

const SystemStatus = mongoose.model('SystemStatus', systemStatusSchema);

module.exports = SystemStatus;

