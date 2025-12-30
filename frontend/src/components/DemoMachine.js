/**
 * Demo Machine Component
 * Simulates the perfume dispensing machine hardware for testing
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemAPI, orderAPI } from '../services/api';
import './DemoMachine.css';

const perfumes = [
  { id: 1, name: 'Chanel No. 5', color: '#d4af37', gradient: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)', category: 'ULTRA-LUXURY' },
  { id: 2, name: 'Tom Ford Black Orchid', color: '#2c2c2c', gradient: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', category: 'ULTRA-LUXURY' },
  { id: 3, name: 'Creed Aventus', color: '#8b7355', gradient: 'linear-gradient(135deg, #8b7355 0%, #6b5b4f 100%)', category: 'ULTRA-LUXURY' },
  { id: 4, name: 'Dior Sauvage', color: '#4169e1', gradient: 'linear-gradient(135deg, #4169e1 0%, #1e3a8a 100%)', category: 'LUXURY DESIGNER' },
  { id: 5, name: 'Yves Saint Laurent Libre', color: '#9370db', gradient: 'linear-gradient(135deg, #9370db 0%, #6a5acd 100%)', category: 'LUXURY DESIGNER' },
  { id: 6, name: 'Armani Code', color: '#34495e', gradient: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)', category: 'LUXURY DESIGNER' },
  { id: 7, name: 'Versace Eros', color: '#ff6b6b', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)', category: 'PREMIUM DESIGNERS' },
  { id: 8, name: 'Acqua di Gio', color: '#4ecdc4', gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)', category: 'PREMIUM DESIGNERS' },
  { id: 9, name: 'Hugo Boss Bottled', color: '#e74c3c', gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', category: 'PREMIUM DESIGNERS' },
  { id: 10, name: 'Bleu de Chanel', color: '#5dade2', gradient: 'linear-gradient(135deg, #5dade2 0%, #3498db 100%)', category: 'NICHE ARTISAN' },
  { id: 11, name: 'Maison Margiela Replica', color: '#c0c0c0', gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)', category: 'NICHE ARTISAN' },
  { id: 12, name: 'Polo Blue', color: '#3498db', gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', category: 'NICHE ARTISAN' },
];

const DemoMachine = () => {
  const navigate = useNavigate();
  const [machineStatus, setMachineStatus] = useState('online');
  const [perfumeLevels, setPerfumeLevels] = useState({});
  const [isDispensing, setIsDispensing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [pingInterval, setPingInterval] = useState(null);
  const [autoPing, setAutoPing] = useState(false);
  const [autoDispense, setAutoDispense] = useState(false);
  const [autoDispenseInterval, setAutoDispenseInterval] = useState(null);

  // Fetch system status on mount
  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // Auto-ping functionality
  useEffect(() => {
    if (autoPing) {
      const interval = setInterval(() => {
        sendPing();
      }, 5000); // Ping every 5 seconds
      setPingInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (pingInterval) {
        clearInterval(pingInterval);
        setPingInterval(null);
      }
    }
  }, [autoPing]);

  // Auto-dispense functionality - automatically check and dispense orders
  useEffect(() => {
    const hasEnoughLevel = () => {
      // Check if any perfume has enough level (>= 10%)
      return Object.values(perfumeLevels).some(level => level >= 10);
    };

    if (autoDispense && machineStatus === 'online' && !isDispensing && hasEnoughLevel()) {
      const interval = setInterval(async () => {
        // Only check if not currently dispensing
        if (!isDispensing && machineStatus === 'online' && hasEnoughLevel()) {
          try {
            // Check for pending orders and auto-dispense
            const order = await checkForOrders();
            if (order) {
              // Auto-dispense the order
              await simulateDispense(order);
            }
          } catch (err) {
            console.error('Auto-dispense error:', err);
          }
        }
      }, 3000); // Check every 3 seconds
      setAutoDispenseInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (autoDispenseInterval) {
        clearInterval(autoDispenseInterval);
        setAutoDispenseInterval(null);
      }
    }
  }, [autoDispense, machineStatus, isDispensing, perfumeLevels]);

  const fetchSystemStatus = async () => {
    try {
      const response = await systemAPI.getStatus();
      if (response.data) {
        setSystemStatus(response.data);
        setMachineStatus(response.data.machineStatus || 'online');
        // Initialize perfume levels from system status
        if (response.data.perfumeLevels) {
          setPerfumeLevels(response.data.perfumeLevels);
        } else {
          // Initialize all to 100 if not present
          const initialLevels = {};
          perfumes.forEach(p => {
            initialLevels[p.id.toString()] = response.data.perfumeLevel || 100;
          });
          setPerfumeLevels(initialLevels);
        }
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
    }
  };

  const sendPing = async () => {
    try {
      await systemAPI.updateStatus(machineStatus, null, perfumeLevels);
      await fetchSystemStatus();
      console.log('✅ Ping sent successfully');
    } catch (err) {
      console.error('Error sending ping:', err);
    }
  };

  const checkForOrders = async () => {
    try {
      // Call trigger-dispense without orderId to check for pending orders
      const response = await orderAPI.triggerDispense(null);
      console.log('Check for orders response:', response);

      if (response && response.success && response.hasOrder) {
        setCurrentOrder(response.data);
        return response.data;
      } else {
        setCurrentOrder(null);
        if (response && response.message) {
          console.log('No orders:', response.message);
        }
        return null;
      }
    } catch (err) {
      console.error('❌ Error checking for orders:', err);
      const errorMessage = err.message || 'Failed to check for orders';
      console.error('Error details:', errorMessage);
      return null;
    }
  };

  const simulateDispense = async (specificOrder = null) => {
    if (isDispensing) return;

    let order = specificOrder;

    // If no specific order provided, check for pending orders
    if (!order) {
      order = await checkForOrders();
    }

    if (!order) {
      if (!specificOrder) {
        alert('No pending orders to dispense');
      }
      return;
    }

    setIsDispensing(true);
    setCurrentOrder(order);

    // Simulate dispensing process - use 5 seconds as requested
    const completionDelay = 5000; // 5 seconds

    // Reduce specific perfume level (0.1% per spray - 1000 sprays = 100%)
    const SPRAY_CONSUMPTION_RATE = 0.1;
    const perfumeId = order.perfumeId || 1;
    const sprays = order.sprays || order.spraysRequested || 1;
    const currentLevel = perfumeLevels[perfumeId.toString()] || 100;
    const newLevel = Math.max(0, currentLevel - sprays * SPRAY_CONSUMPTION_RATE);

    // Round to match backend precision
    const roundedLevel = Math.round(newLevel * 1000) / 1000;

    const updatedLevels = { ...perfumeLevels };
    updatedLevels[perfumeId.toString()] = roundedLevel;
    setPerfumeLevels(updatedLevels);

    // Update system status with individual perfume levels
    await systemAPI.updateStatus(machineStatus, null, updatedLevels);

    // Simulate pump running for 5 seconds
    setTimeout(async () => {
      try {
        console.log('⏰ 5 seconds elapsed, confirming dispense for order:', order.orderId);

        // Confirm dispense completion with success status
        const confirmResponse = await orderAPI.confirmDispense(
          order.orderId,
          'success',
          'Dispense completed successfully'
        );

        if (confirmResponse.success) {
          console.log('✅ Dispense confirmed successfully');

          // Update system statistics
          await fetchSystemStatus();

          setIsDispensing(false);
          setCurrentOrder(null);

          if (!autoDispense) {
            alert(`✅ Dispensing completed! Order ${order.orderId} dispensed successfully.`);
          } else {
            console.log(`✅ Auto-dispensed order ${order.orderId}`);
          }
        } else {
          console.error('Confirm dispense returned false:', confirmResponse);
          setIsDispensing(false);
          if (!autoDispense) {
            alert('⚠️ Dispense may have completed but confirmation had issues');
          }
        }
      } catch (err) {
        console.error('Error confirming dispense:', err);
        console.error('Error details:', err.response?.data);
        setIsDispensing(false);
        if (!autoDispense) {
          alert('❌ Error confirming dispense: ' + (err.response?.data?.message || err.message));
        }
      }
    }, completionDelay); // 5 seconds
  };

  const handleStatusChange = async (newStatus) => {
    setMachineStatus(newStatus);
    await systemAPI.updateStatus(newStatus, null, perfumeLevels);
    await fetchSystemStatus();
  };

  const handlePerfumeLevelChange = async (perfumeId, newLevel) => {
    const level = Math.max(0, Math.min(100, newLevel));
    const updatedLevels = { ...perfumeLevels };
    updatedLevels[perfumeId.toString()] = level;
    setPerfumeLevels(updatedLevels);
    await systemAPI.updateStatus(machineStatus, null, updatedLevels);
    await fetchSystemStatus();
  };

  const toggleAutoPing = () => {
    setAutoPing(!autoPing);
  };

  return (
    <div className="demo-machine">
      <div className="container">
        <header className="demo-header">
          <div className="header-top">
            <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
              ← Back to Dashboard
            </button>
          </div>
          <h1>🔧 Demo Machine Simulator</h1>
          <p>Simulate the perfume dispensing machine hardware for testing</p>
        </header>

        <div className="demo-grid">
          {/* Machine Status Card */}
          <div className="demo-card">
            <h3>Machine Status</h3>
            <div className="status-controls">
              <button
                className={`btn ${machineStatus === 'online' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => handleStatusChange('online')}
                disabled={isDispensing}
              >
                Online
              </button>
              <button
                className={`btn ${machineStatus === 'offline' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => handleStatusChange('offline')}
                disabled={isDispensing}
              >
                Offline
              </button>
              <button
                className={`btn ${machineStatus === 'maintenance' ? 'btn-warning' : 'btn-secondary'}`}
                onClick={() => handleStatusChange('maintenance')}
                disabled={isDispensing}
              >
                Maintenance
              </button>
            </div>
            <div className="current-status">
              <span className={`status-badge status-${machineStatus}`}>
                {machineStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Individual Perfume Levels Card */}
          <div className="demo-card full-width">
            <h3>Individual Perfume Levels</h3>
            <div className="demo-perfume-levels-grid">
              {perfumes.map((perfume) => {
                const level = perfumeLevels[perfume.id.toString()] || 100;
                const isLow = level < 10;
                const isMedium = level >= 10 && level < 30;

                return (
                  <div
                    key={perfume.id}
                    className="demo-perfume-item"
                    style={{
                      borderLeftColor: perfume.color,
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div className="demo-perfume-header">
                      <span className="demo-perfume-number" style={{ background: perfume.color }}>
                        #{perfume.id}
                      </span>
                      <span className="demo-perfume-name">{perfume.name}</span>
                    </div>
                    <div className="demo-perfume-level-value" style={{ color: perfume.color }}>
                      {level.toFixed(1)}%
                    </div>
                    <div className="demo-perfume-progress-bar">
                      <div
                        className={`demo-perfume-progress-fill ${isLow ? 'low' : isMedium ? 'medium' : 'high'}`}
                        style={{
                          width: `${level}%`,
                          background: isLow ? '#ef4444' : isMedium ? '#f59e0b' : perfume.gradient
                        }}
                      >
                        {level >= 5 && `${level.toFixed(1)}%`}
                      </div>
                    </div>
                    <div className="demo-perfume-controls">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handlePerfumeLevelChange(perfume.id, level - 10)}
                        disabled={level <= 0 || isDispensing}
                        title="Decrease by 10%"
                      >
                        -10%
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handlePerfumeLevelChange(perfume.id, level + 10)}
                        disabled={level >= 100 || isDispensing}
                        title="Increase by 10%"
                      >
                        +10%
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handlePerfumeLevelChange(perfume.id, 100)}
                        disabled={level >= 100 || isDispensing}
                        title="Fill to 100%"
                        style={{ background: perfume.color }}
                      >
                        Fill
                      </button>
                    </div>
                    {isLow && (
                      <div className="demo-perfume-warning">⚠️ Low Level</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispensing Control Card */}
          <div className="demo-card">
            <h3>Dispensing Control</h3>
            {currentOrder && (
              <div className="current-order-info">
                <p><strong>Order ID:</strong> {currentOrder.orderId}</p>
                <p><strong>Sprays:</strong> {currentOrder.sprays || 1}</p>
                <p><strong>Duration:</strong> {currentOrder.pumpDurationMs || 2000}ms</p>
              </div>
            )}
            <div className="dispense-controls">
              <button
                className="btn btn-success btn-large"
                onClick={() => simulateDispense()}
                disabled={isDispensing || machineStatus !== 'online' || !Object.values(perfumeLevels).some(l => l >= 10)}
              >
                {isDispensing ? '🔄 Dispensing...' : '🚿 Check & Dispense Order'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={checkForOrders}
                disabled={isDispensing}
              >
                🔍 Check for Orders
              </button>
            </div>
            {isDispensing && (
              <div className="dispensing-animation">
                <div className="pump-indicator">💨 Pump Running...</div>
              </div>
            )}
          </div>

          {/* System Communication Card */}
          <div className="demo-card">
            <h3>System Communication</h3>
            <div className="communication-controls">
              <button
                className="btn btn-primary"
                onClick={sendPing}
                disabled={isDispensing}
              >
                📡 Send Ping
              </button>
              <button
                className={`btn ${autoPing ? 'btn-success' : 'btn-secondary'}`}
                onClick={toggleAutoPing}
                disabled={isDispensing}
              >
                {autoPing ? '⏸️ Stop Auto-Ping' : '▶️ Start Auto-Ping'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={fetchSystemStatus}
                disabled={isDispensing}
              >
                🔄 Refresh Status
              </button>
            </div>
            {autoPing && (
              <div className="auto-ping-indicator">
                <span className="ping-dot"></span>
                Auto-pinging every 5 seconds...
              </div>
            )}
          </div>

          {/* System Status Display */}
          {systemStatus && (
            <div className="demo-card full-width">
              <h3>System Status</h3>
              <div className="system-status-grid">
                <div className="status-item">
                  <span className="label">Last Ping:</span>
                  <span className="value">
                    {systemStatus.lastMicrocontrollerPing
                      ? new Date(systemStatus.lastMicrocontrollerPing).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Last Dispense:</span>
                  <span className="value">
                    {systemStatus.lastDispenseTime
                      ? new Date(systemStatus.lastDispenseTime).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Total Sales:</span>
                  <span className="value">{systemStatus.totalSales || 0}</span>
                </div>
                <div className="status-item">
                  <span className="label">Total Revenue:</span>
                  <span className="value">₹{systemStatus.totalRevenue || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoMachine;

