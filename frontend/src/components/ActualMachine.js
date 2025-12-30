/**
 * Actual Machine Component
 * Controls the real ESP32 machine via Blynk
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemAPI, orderAPI } from '../services/api';
import './ActualMachine.css';

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

const ActualMachine = () => {
  const navigate = useNavigate();
  const [machineStatus, setMachineStatus] = useState('offline');
  const [perfumeLevels, setPerfumeLevels] = useState({});
  const [isDispensing, setIsDispensing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [blynkConnected, setBlynkConnected] = useState(false);
  const [blynkToken, setBlynkToken] = useState('');
  const [blynkServer, setBlynkServer] = useState('blynk.cloud'); // or your local server
  const [autoDispense, setAutoDispense] = useState(false);
  const [autoDispenseInterval, setAutoDispenseInterval] = useState(null);

  // Load Blynk configuration from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('blynkToken');
    const savedServer = localStorage.getItem('blynkServer');
    if (savedToken) setBlynkToken(savedToken);
    if (savedServer) setBlynkServer(savedServer);
  }, []);

  // Fetch system status on mount
  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Check Blynk connection
  useEffect(() => {
    if (blynkToken) {
      checkBlynkConnection();
      const interval = setInterval(checkBlynkConnection, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [blynkToken, blynkServer]);

  // Auto-dispense functionality
  useEffect(() => {
    const hasEnoughLevel = () => {
      // Check if any perfume has enough level (>= 10%)
      return Object.values(perfumeLevels).some(level => level >= 10);
    };

    if (autoDispense && machineStatus === 'online' && !isDispensing && hasEnoughLevel() && blynkConnected) {
      const interval = setInterval(async () => {
        if (!isDispensing && machineStatus === 'online' && hasEnoughLevel()) {
          try {
            const order = await checkForOrders();
            if (order) {
              await triggerDispense(order);
            }
          } catch (err) {
            console.error('Auto-dispense error:', err);
          }
        }
      }, 3000);
      setAutoDispenseInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (autoDispenseInterval) {
        clearInterval(autoDispenseInterval);
        setAutoDispenseInterval(null);
      }
    }
  }, [autoDispense, machineStatus, isDispensing, perfumeLevels, blynkConnected]);

  const fetchSystemStatus = async () => {
    try {
      const response = await systemAPI.getStatus();
      if (response.data) {
        setSystemStatus(response.data);
        setMachineStatus(response.data.machineStatus || 'offline');
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

  const checkBlynkConnection = async () => {
    if (!blynkToken) {
      setBlynkConnected(false);
      return;
    }

    try {
      // Check Blynk connection by reading a virtual pin
      const serverUrl = blynkServer === 'blynk.cloud' 
        ? 'https://blynk.cloud/external/api/get'
        : `http://${blynkServer}/external/api/get`;
      
      const response = await fetch(
        `${serverUrl}?token=${blynkToken}&V0`, // V0 = connection status
        { method: 'GET', timeout: 5000 }
      );
      
      if (response.ok) {
        setBlynkConnected(true);
        // Read machine status from Blynk
        await readBlynkStatus();
      } else {
        setBlynkConnected(false);
      }
    } catch (err) {
      console.error('Blynk connection check failed:', err);
      setBlynkConnected(false);
    }
  };

  const readBlynkStatus = async () => {
    if (!blynkToken) return;

    try {
      const serverUrl = blynkServer === 'blynk.cloud'
        ? 'https://blynk.cloud/external/api/get'
        : `http://${blynkServer}/external/api/get`;

      // Read virtual pins from ESP32
      // V0 = Machine Status (0=offline, 1=online, 2=maintenance)
      // V1 = Perfume Level (0-100)
      // V2 = Is Dispensing (0=no, 1=yes)

      const [statusRes, levelRes, dispensingRes] = await Promise.all([
        fetch(`${serverUrl}?token=${blynkToken}&V0`),
        fetch(`${serverUrl}?token=${blynkToken}&V1`),
        fetch(`${serverUrl}?token=${blynkToken}&V2`)
      ]);

      if (statusRes.ok) {
        const status = await statusRes.text();
        const statusMap = { '0': 'offline', '1': 'online', '2': 'maintenance' };
        setMachineStatus(statusMap[status] || 'offline');
      }

      if (levelRes.ok) {
        const level = parseFloat(await levelRes.text());
        if (!isNaN(level)) setPerfumeLevel(level);
      }

      if (dispensingRes.ok) {
        const dispensing = await dispensingRes.text();
        setIsDispensing(dispensing === '1');
      }
    } catch (err) {
      console.error('Error reading Blynk status:', err);
    }
  };

  const writeBlynkPin = async (pin, value) => {
    if (!blynkToken) return false;

    try {
      const serverUrl = blynkServer === 'blynk.cloud'
        ? 'https://blynk.cloud/external/api/update'
        : `http://${blynkServer}/external/api/update`;

      const response = await fetch(
        `${serverUrl}?token=${blynkToken}&${pin}=${value}`,
        { method: 'GET' }
      );

      return response.ok;
    } catch (err) {
      console.error(`Error writing Blynk pin ${pin}:`, err);
      return false;
    }
  };

  const checkForOrders = async () => {
    try {
      const response = await orderAPI.triggerDispense(null);
      if (response.success && response.hasOrder) {
        setCurrentOrder(response.data);
        return response.data;
      } else {
        setCurrentOrder(null);
        return null;
      }
    } catch (err) {
      console.error('Error checking for orders:', err);
      return null;
    }
  };

  const triggerDispense = async (specificOrder = null) => {
    if (isDispensing || !blynkConnected) return;

    let order = specificOrder;
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

    try {
      // Send dispense command to ESP32 via Blynk
      // V10 = Trigger Dispense (perfumeId)
      // V11 = Number of Sprays
      // V12 = Pump Duration (ms)

      const perfumeId = order.perfumeId || 1;
      const sprays = order.sprays || order.spraysRequested || 1;
      const pumpDuration = order.pumpDurationMs || 2000;

      // Write dispense parameters to Blynk
      await writeBlynkPin('V11', sprays);
      await writeBlynkPin('V12', pumpDuration);
      
      // Trigger dispense by writing perfume ID to V10
      const success = await writeBlynkPin('V10', perfumeId);

      if (success) {
        // Wait for ESP32 to complete dispensing (poll V2 to check when done)
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait

        const checkInterval = setInterval(async () => {
          attempts++;
          try {
            const serverUrl = blynkServer === 'blynk.cloud'
              ? 'https://blynk.cloud/external/api/get'
              : `http://${blynkServer}/external/api/get`;
            
            const response = await fetch(`${serverUrl}?token=${blynkToken}&V2`);
            if (response.ok) {
              const isDispensingValue = await response.text();
              if (isDispensingValue === '0' || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                setIsDispensing(false);
                
                // Confirm dispense to backend
                await orderAPI.confirmDispense(
                  order.orderId,
                  'success',
                  'Dispense completed via Blynk'
                );
                
                await fetchSystemStatus();
                setCurrentOrder(null);
                
                if (!autoDispense) {
                  alert(`✅ Dispensing completed! Order ${order.orderId} dispensed successfully.`);
                }
              }
            }
          } catch (err) {
            console.error('Error checking dispense status:', err);
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              setIsDispensing(false);
            }
          }
        }, 1000); // Check every second
      } else {
        setIsDispensing(false);
        alert('❌ Failed to send dispense command to ESP32');
      }
    } catch (err) {
      console.error('Error triggering dispense:', err);
      setIsDispensing(false);
      alert('❌ Error: ' + (err.message || 'Failed to trigger dispense'));
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!blynkConnected) {
      alert('Blynk not connected. Please configure Blynk token first.');
      return;
    }

    const statusMap = { 'offline': 0, 'online': 1, 'maintenance': 2 };
    const statusValue = statusMap[newStatus] || 0;
    
    const success = await writeBlynkPin('V0', statusValue);
    if (success) {
      setMachineStatus(newStatus);
      await systemAPI.updateStatus(newStatus, null, perfumeLevels);
      await fetchSystemStatus();
    } else {
      alert('Failed to update machine status');
    }
  };

  const handlePerfumeLevelChange = async (perfumeId, newLevel) => {
    if (!blynkConnected) {
      alert('Blynk not connected. Please configure Blynk token first.');
      return;
    }

    const level = Math.max(0, Math.min(100, newLevel));
    const updatedLevels = { ...perfumeLevels };
    updatedLevels[perfumeId.toString()] = level;
    
    // Update via Blynk (V1-V12 for perfumes 1-12)
    const blynkPin = `V${perfumeId}`;
    const success = await writeBlynkPin(blynkPin, level);
    if (success) {
      setPerfumeLevels(updatedLevels);
      await systemAPI.updateStatus(machineStatus, null, updatedLevels);
      await fetchSystemStatus();
    } else {
      alert('Failed to update perfume level');
    }
  };

  const handleBlynkConfig = () => {
    const token = prompt('Enter your Blynk Auth Token:', blynkToken);
    if (token) {
      setBlynkToken(token);
      localStorage.setItem('blynkToken', token);
    }

    const server = prompt('Enter Blynk Server (blynk.cloud or IP:port):', blynkServer);
    if (server) {
      setBlynkServer(server);
      localStorage.setItem('blynkServer', server);
    }

    checkBlynkConnection();
  };

  const toggleAutoDispense = () => {
    setAutoDispense(!autoDispense);
  };

  return (
    <div className="actual-machine">
      <div className="container">
        <header className="machine-header">
          <div className="header-top">
            <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
              ← Back to Dashboard
            </button>
          </div>
          <h1>🤖 Actual Machine Control (ESP32 + Blynk)</h1>
          <p>Control the real perfume dispensing machine via Blynk</p>
        </header>

        {/* Blynk Connection Status */}
        <div className={`blynk-status-card ${blynkConnected ? 'connected' : 'disconnected'}`}>
          <div className="blynk-status-header">
            <span className="status-indicator"></span>
            <span className="status-text">
              {blynkConnected ? '🟢 Connected to Blynk' : '🔴 Not Connected to Blynk'}
            </span>
          </div>
          <div className="blynk-config">
            <button className="btn btn-primary" onClick={handleBlynkConfig}>
              ⚙️ Configure Blynk
            </button>
            <button className="btn btn-secondary" onClick={checkBlynkConnection}>
              🔄 Check Connection
            </button>
          </div>
          {blynkToken && (
            <div className="blynk-info">
              <small>Token: {blynkToken.substring(0, 8)}... | Server: {blynkServer}</small>
            </div>
          )}
        </div>

        <div className="machine-grid">
          {/* Machine Status Card */}
          <div className="machine-card">
            <h3>Machine Status</h3>
            <div className="status-controls">
              <button
                className={`btn ${machineStatus === 'online' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => handleStatusChange('online')}
                disabled={isDispensing || !blynkConnected}
              >
                Online
              </button>
              <button
                className={`btn ${machineStatus === 'offline' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => handleStatusChange('offline')}
                disabled={isDispensing || !blynkConnected}
              >
                Offline
              </button>
              <button
                className={`btn ${machineStatus === 'maintenance' ? 'btn-warning' : 'btn-secondary'}`}
                onClick={() => handleStatusChange('maintenance')}
                disabled={isDispensing || !blynkConnected}
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
          <div className="machine-card full-width">
            <h3>Individual Perfume Levels</h3>
            <div className="machine-perfume-levels-grid">
              {perfumes.map((perfume) => {
                const level = perfumeLevels[perfume.id.toString()] || 0;
                const isLow = level < 10;
                const isMedium = level >= 10 && level < 30;
                
                return (
                  <div 
                    key={perfume.id} 
                    className="machine-perfume-item"
                    style={{ 
                      borderLeftColor: perfume.color,
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div className="machine-perfume-header">
                      <span className="machine-perfume-number" style={{ background: perfume.color }}>
                        #{perfume.id}
                      </span>
                      <span className="machine-perfume-name">{perfume.name}</span>
                    </div>
                    <div className="machine-perfume-level-value" style={{ color: perfume.color }}>
                      {level.toFixed(1)}%
                    </div>
                    <div className="machine-perfume-progress-bar">
                      <div
                        className={`machine-perfume-progress-fill ${isLow ? 'low' : isMedium ? 'medium' : 'high'}`}
                        style={{ 
                          width: `${level}%`,
                          background: isLow ? '#ef4444' : isMedium ? '#f59e0b' : perfume.gradient
                        }}
                      >
                        {level >= 5 && `${level.toFixed(1)}%`}
                      </div>
                    </div>
                    <div className="machine-perfume-controls">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handlePerfumeLevelChange(perfume.id, level - 10)}
                        disabled={level <= 0 || isDispensing || !blynkConnected}
                        title="Decrease by 10%"
                      >
                        -10%
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handlePerfumeLevelChange(perfume.id, level + 10)}
                        disabled={level >= 100 || isDispensing || !blynkConnected}
                        title="Increase by 10%"
                      >
                        +10%
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handlePerfumeLevelChange(perfume.id, 100)}
                        disabled={level >= 100 || isDispensing || !blynkConnected}
                        title="Fill to 100%"
                        style={{ background: perfume.color }}
                      >
                        Fill
                      </button>
                    </div>
                    {isLow && (
                      <div className="machine-perfume-warning">⚠️ Low Level</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispensing Control Card */}
          <div className="machine-card">
            <h3>Dispensing Control</h3>
            {currentOrder && (
              <div className="current-order-info">
                <p><strong>Order ID:</strong> {currentOrder.orderId}</p>
                <p><strong>Perfume ID:</strong> {currentOrder.perfumeId || 1}</p>
                <p><strong>Sprays:</strong> {currentOrder.sprays || currentOrder.spraysRequested || 1}</p>
                <p><strong>Duration:</strong> {currentOrder.pumpDurationMs || 2000}ms</p>
              </div>
            )}
            <div className="dispense-controls">
              <button
                className="btn btn-success btn-large"
                onClick={() => triggerDispense()}
                disabled={isDispensing || machineStatus !== 'online' || !Object.values(perfumeLevels).some(l => l >= 10) || !blynkConnected}
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
              <button
                className={`btn ${autoDispense ? 'btn-success' : 'btn-secondary'}`}
                onClick={toggleAutoDispense}
                disabled={!blynkConnected || machineStatus !== 'online'}
              >
                {autoDispense ? '⏸️ Stop Auto-Dispense' : '▶️ Start Auto-Dispense'}
              </button>
            </div>
            {isDispensing && (
              <div className="dispensing-animation">
                <div className="pump-indicator">💨 Pump Running via ESP32...</div>
              </div>
            )}
          </div>

          {/* System Status Display */}
          {systemStatus && (
            <div className="machine-card full-width">
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

export default ActualMachine;

