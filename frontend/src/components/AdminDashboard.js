/**
 * Admin Dashboard Component
 * Displays system status, statistics, recent orders, and machine controls
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemAPI, authAPI, orderAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [systemStatus, setSystemStatus] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Demo Machine State
  const [machineStatus, setMachineStatus] = useState('online');
  const [isDispensing, setIsDispensing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [autoPing, setAutoPing] = useState(false);
  const [pingInterval, setPingInterval] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  // Fetch admin user info
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await authAPI.verifyToken();
        if (response.success && response.data?.user) {
          setAdminUser(response.data.user);
        }
      } catch (err) {
        console.error('Error fetching admin info:', err);
      }
    };
    fetchAdminInfo();
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    let isMounted = true;

    const fetchDataOnce = async () => {
      try {
        setError(null);
        setLoading(true);

        // Fetch all data in parallel
        const [statusResponse, statsResponse, ordersResponse] = await Promise.all([
          systemAPI.getStatus().catch(err => {
            console.error('Status API error:', err);
            return { data: null };
          }),
          systemAPI.getStatistics().catch(err => {
            console.error('Statistics API error:', err);
            return { data: null };
          }),
          systemAPI.getRecentOrders(20).catch(err => {
            console.error('Orders API error:', err);
            return { data: [] };
          }),
        ]);

        if (isMounted) {
          if (statusResponse?.data) {
            setSystemStatus(statusResponse.data);
            setMachineStatus(statusResponse.data.machineStatus || 'online');
          }
          if (statsResponse?.data) setStatistics(statsResponse.data);
          if (ordersResponse?.data) setRecentOrders(ordersResponse.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (isMounted) {
          setError('Failed to fetch data. Please check server connection.');
          setLoading(false);
        }
      }
    };

    fetchDataOnce();

    const autoRefreshInterval = setInterval(() => {
      if (isMounted && !loading) {
        fetchData();
      }
    }, 20000); // Refresh every 20 seconds

    return () => {
      isMounted = false;
      clearInterval(autoRefreshInterval);
    };
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

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [statusResponse, statsResponse, ordersResponse] = await Promise.all([
        systemAPI.getStatus().catch(err => ({ data: null })),
        systemAPI.getStatistics().catch(err => ({ data: null })),
        systemAPI.getRecentOrders(20).catch(err => ({ data: [] })),
      ]);

      if (statusResponse?.data) {
        setSystemStatus(statusResponse.data);
        // Only update machine status from server if we are not actively changing it locally
        // This prevents UI jumping if multiple admins are editing, but good enough for now
        setMachineStatus(statusResponse.data.machineStatus || 'online');
      }
      if (statsResponse?.data) setStatistics(statsResponse.data);
      if (ordersResponse?.data) setRecentOrders(ordersResponse.data || []);

    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // --- Demo Machine Logic ---

  const handleStatusChange = async (newStatus) => {
    try {
      setMachineStatus(newStatus);
      // Preserve existing perfume levels when updating status
      const currentLevels = systemStatus?.perfumeLevels || {};
      await systemAPI.updateStatus(newStatus, null, currentLevels);
      await fetchData();
    } catch (err) {
      console.error('Error updating machine status:', err);
      alert('Failed to update machine status');
    }
  };

  const sendPing = async () => {
    try {
      const currentLevels = systemStatus?.perfumeLevels || {};
      await systemAPI.updateStatus(machineStatus, null, currentLevels);
      await fetchData();
      console.log('✅ Ping sent successfully');
    } catch (err) {
      console.error('Error sending ping:', err);
    }
  };

  const toggleAutoPing = () => {
    setAutoPing(!autoPing);
  };

  const checkForOrders = async () => {
    try {
      const response = await orderAPI.triggerDispense(null);

      if (response && response.success && response.hasOrder) {
        setCurrentOrder(response.data);
        return response.data;
      } else {
        setCurrentOrder(null);
        if (response && response.message && !response.success) {
          // Only show alert if it's an error (like machine offline), not just "no orders"
          if (response.message !== 'No pending orders') {
            alert(response.message);
          }
        } else if (response && !response.hasOrder) {
          alert('No pending orders found.');
        }
        return null;
      }
    } catch (err) {
      console.error('❌ Error checking for orders:', err);
      alert('Failed to check for orders: ' + (err.message || 'Unknown error'));
      return null;
    }
  };

  const simulateDispense = async () => {
    if (isDispensing) return;

    let order = await checkForOrders();

    if (!order) {
      return;
    }

    setIsDispensing(true);
    setCurrentOrder(order);

    // Simulate dispensing process
    const completionDelay = 5000; // 5 seconds

    // Reduce specific perfume level locally for immediate UI feedback
    const perfumeId = order.perfumeId || 1;
    const sprays = order.sprays || order.spraysRequested || 1;

    // We don't calculate level here, we let the backend handle it on confirmation
    // But we do need to pass current levels to updateStatus if we were simulating full hardware
    // For this dashboard, we'll just wait and confirm.

    setTimeout(async () => {
      try {
        // Confirm dispense completion with success status
        const confirmResponse = await orderAPI.confirmDispense(
          order.orderId,
          'success',
          'Dispense completed successfully (Admin Simulation)'
        );

        if (confirmResponse.success) {
          await fetchData(); // Refresh all data
          setIsDispensing(false);
          setCurrentOrder(null);
          alert(`✅ Dispensing completed! Order ${order.orderId} dispensed successfully.`);
        } else {
          setIsDispensing(false);
          alert('⚠️ Dispense may have completed but confirmation had issues');
        }
      } catch (err) {
        console.error('Error confirming dispense:', err);
        setIsDispensing(false);
        alert('❌ Error confirming dispense: ' + (err.response?.data?.message || err.message));
      }
    }, completionDelay);
  };

  // --- End Demo Machine Logic ---

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatPerfumeLevel = (level) => {
    if (level === null || level === undefined) return '0.000';
    return parseFloat(level).toFixed(3);
  };

  const formatAveragePerfumeLevel = (level) => {
    if (level === null || level === undefined) return '0.0';
    return parseFloat(level).toFixed(2);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'online':
        return 'status-badge status-online';
      case 'offline':
        return 'status-badge status-offline';
      case 'maintenance':
        return 'status-badge status-maintenance';
      case 'error':
        return 'status-badge status-error';
      default:
        return 'status-badge status-offline';
    }
  };

  const getDispensingStatusBadge = (status) => {
    const statusClasses = {
      completed: 'status-badge status-online',
      failed: 'status-badge status-error',
      pending: 'status-badge status-maintenance',
      in_progress: 'status-badge status-online',
    };
    return statusClasses[status] || 'status-badge status-offline';
  };

  const handleClearAllOrders = () => {
    setShowClearConfirm(true);
    setConfirmText('');
  };

  const handleConfirmClear = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type "DELETE" (in uppercase) to confirm this action.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setShowClearConfirm(false);
      setConfirmText('');

      const response = await systemAPI.clearAllOrders();

      if (response.success) {
        alert(`✅ ${response.message}`);
        await fetchData();
      } else {
        setError(response.message || 'Failed to clear orders');
      }
    } catch (err) {
      console.error('Error clearing orders:', err);
      setError(err.response?.data?.message || 'Failed to clear orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
    setConfirmText('');
  };

  const handleFillPerfume = async (perfumeId, fillLevel = 100) => {
    try {
      await systemAPI.updatePerfumeLevel(perfumeId, fillLevel);
      await fetchData();
    } catch (err) {
      console.error('Error updating perfume level:', err);
      alert(`Failed to update perfume level: ${err.message}`);
    }
  };

  const handleAdjustPerfumeLevel = async (perfumeId, adjustment) => {
    const perfumeIdStr = perfumeId.toString();
    const currentLevel = systemStatus.perfumeLevels?.[perfumeIdStr] ?? 100;
    const newLevel = Math.max(0, Math.min(100, currentLevel + adjustment));
    try {
      await systemAPI.updatePerfumeLevel(perfumeId, newLevel);
      await fetchData();
    } catch (err) {
      console.error('Error updating perfume level:', err);
      alert(`Failed to update perfume level: ${err.message}`);
    }
  };

  if (loading && !systemStatus && !statistics && recentOrders.length === 0) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="spinner"></div>
          <p style={{ textAlign: 'center', color: 'white' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <header className="dashboard-header">
          <div className="dashboard-logo">
            <img src="/images/aureole-logo.png" alt="AUREOLE" />
          </div>
          <h2>Admin Dashboard</h2>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            <button
              className="btn btn-danger"
              onClick={handleClearAllOrders}
              disabled={loading}
              style={{ marginLeft: '10px' }}
              title="Delete all orders and reset statistics"
            >
              🗑️ Clear All Orders
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ marginLeft: '10px' }}
              title="Logout from admin panel"
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Machine Controls Section */}
        <div className="card">
          <h3 className="card-title">Machine Controls</h3>
          <div className="controls-grid">

            {/* Machine Status */}
            <div className="control-group">
              <h4>Machine Status</h4>
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
              <div className="current-status-display">
                Current: <span className={`status-badge status-${machineStatus}`}>{machineStatus.toUpperCase()}</span>
              </div>
            </div>

            {/* Dispensing Control */}
            <div className="control-group">
              <h4>Dispensing Control</h4>
              <div className="dispense-controls">
                <button
                  className="btn btn-success"
                  onClick={simulateDispense}
                  disabled={isDispensing || machineStatus !== 'online'}
                  title="Check for pending orders and simulate dispensing"
                >
                  {isDispensing ? '🔄 Dispensing...' : '🚿 Check & Dispense'}
                </button>
              </div>
              {currentOrder && (
                <div className="current-order-mini">
                  <small>Processing: {currentOrder.orderId}</small>
                </div>
              )}
            </div>

            {/* System Communication */}
            <div className="control-group">
              <h4>System Communication</h4>
              <div className="communication-controls">
                <button
                  className="btn btn-primary"
                  onClick={sendPing}
                  disabled={isDispensing}
                >
                  📡 Ping
                </button>
                <button
                  className={`btn ${autoPing ? 'btn-success' : 'btn-secondary'}`}
                  onClick={toggleAutoPing}
                  disabled={isDispensing}
                >
                  {autoPing ? '⏸️ Stop Auto-Ping' : '▶️ Start Auto-Ping'}
                </button>
              </div>
              {autoPing && <small className="pulsing-text">Auto-ping active...</small>}
            </div>

          </div>
        </div>

        {/* System Status Card */}
        {systemStatus && (
          <div className="card">
            <h3 className="card-title">System Status</h3>
            <div className="grid">
              <div className="stat-card">
                <div className="stat-label">Machine Status</div>
                <div className={getStatusBadgeClass(systemStatus.machineStatus)}>
                  {systemStatus.machineStatus.toUpperCase()}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Average Perfume Level</div>
                <div className="stat-value">{formatAveragePerfumeLevel(systemStatus.perfumeLevel)}%</div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${systemStatus.perfumeLevel}%` }}
                  >
                    {formatAveragePerfumeLevel(systemStatus.perfumeLevel)}%
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Last Ping</div>
                <div className="stat-value" style={{ fontSize: '16px' }}>
                  {systemStatus.lastMicrocontrollerPing
                    ? formatDate(systemStatus.lastMicrocontrollerPing)
                    : 'Never'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Last Dispense</div>
                <div className="stat-value" style={{ fontSize: '16px' }}>
                  {systemStatus.lastDispenseTime
                    ? formatDate(systemStatus.lastDispenseTime)
                    : 'Never'}
                </div>
              </div>
            </div>
            {systemStatus.lastError && (
              <div className="alert alert-error" style={{ marginTop: '16px' }}>
                <strong>Last Error:</strong> {systemStatus.lastError}
                <br />
                <small>{formatDate(systemStatus.lastErrorTime)}</small>
              </div>
            )}
          </div>
        )}

        {/* Individual Perfume Levels Card */}
        {systemStatus && systemStatus.perfumeLevels && (
          <div className="card">
            <h3 className="card-title">Individual Perfume Levels</h3>
            <div className="perfume-levels-grid">
              {[
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
              ].map((perfume) => {
                const perfumeIdStr = perfume.id.toString();
                const level = systemStatus.perfumeLevels?.[perfumeIdStr] ?? systemStatus.perfumeLevel ?? 100;
                const isLow = level < 10;
                const isMedium = level >= 10 && level < 30;

                return (
                  <div
                    key={perfume.id}
                    className={`perfume-level-card ${isLow ? 'low-level' : isMedium ? 'medium-level' : 'high-level'}`}
                    style={{
                      '--perfume-color': perfume.color,
                      '--perfume-gradient': perfume.gradient,
                      borderLeftColor: perfume.color,
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div className="perfume-card-header">
                      {/* Numbering removed as requested */}
                      <div className="perfume-card-info">
                        <div className="perfume-card-name">{perfume.name}</div>
                        <div className="perfume-card-category">{perfume.category}</div>
                      </div>
                    </div>

                    <div className="perfume-card-level-display">
                      <div className="perfume-card-level-value" style={{ color: perfume.color }}>
                        {typeof level === 'number' ? level.toFixed(2) : level}%
                      </div>
                      {/* Progress bar removed as requested */}
                    </div>

                    <div className="perfume-card-controls">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleAdjustPerfumeLevel(perfume.id, -10)}
                        disabled={level <= 0}
                        title="Decrease by 10%"
                      >
                        -10%
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleAdjustPerfumeLevel(perfume.id, 10)}
                        disabled={level >= 100}
                        title="Increase by 10%"
                      >
                        +10%
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleFillPerfume(perfume.id, 100)}
                        disabled={level >= 100}
                        title="Fill to 100%"
                        style={{ background: perfume.color }}
                      >
                        Fill
                      </button>
                    </div>

                    {isLow && (
                      <div className="perfume-card-warning">
                        <span className="warning-icon">⚠️</span>
                        <span className="warning-text">Low Level</span>
                      </div>
                    )}
                    {isMedium && !isLow && (
                      <div className="perfume-card-warning medium-warning">
                        <span className="warning-icon">⚡</span>
                        <span className="warning-text">Monitor</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Statistics Card */}
        {
          statistics && (
            <div className="card">
              <h3 className="card-title">Statistics</h3>
              <div className="grid">
                <div className="stat-card">
                  <div className="stat-label">Total Sales</div>
                  <div className="stat-value">{statistics.systemStatus.totalSales}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-value" style={{ fontSize: '24px' }}>
                    {formatCurrency(statistics.systemStatus.totalRevenue)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Sprays</div>
                  <div className="stat-value">{statistics.systemStatus.totalSpraysDispensed}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Failed Transactions</div>
                  <div className="stat-value" style={{ color: '#dc3545' }}>
                    {statistics.systemStatus.failedTransactions}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Completed Orders</div>
                  <div className="stat-value">{statistics.orders.completed}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Pending Orders</div>
                  <div className="stat-value" style={{ color: '#ffc107' }}>
                    {statistics.orders.pending}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Recent Orders Card */}
        <div className="card">
          <h3 className="card-title">Recent Orders</h3>
          {recentOrders.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              No orders yet. Make a payment to see orders here.
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Amount</th>
                    <th>Sprays</th>
                    <th>Payment Status</th>
                    <th>Dispensing Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id || order.orderId}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {order.orderId || order._id}
                      </td>
                      <td>{formatCurrency(order.amount || 0)}</td>
                      <td>{order.spraysRequested || 1}</td>
                      <td>
                        <span className={getStatusBadgeClass(order.paymentStatus || 'pending')}>
                          {(order.paymentStatus || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={getDispensingStatusBadge(order.dispensingStatus || 'pending')}>
                          {(order.dispensingStatus || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div >

      {/* Clear Orders Confirmation Modal */}
      {
        showClearConfirm && (
          <div className="modal-overlay" onClick={handleCancelClear}>
            <div className="clear-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="clear-confirm-header">
                <h2>⚠️ Confirm Clear All Orders</h2>
              </div>
              <div className="clear-confirm-body">
                <p className="warning-text">
                  <strong>WARNING: This action cannot be undone!</strong>
                </p>
                <p>
                  This will permanently delete <strong>ALL orders</strong> and reset all statistics.
                </p>
                {adminUser && (
                  <p className="admin-info">
                    Logged in as: <strong>{adminUser.name}</strong> ({adminUser.email})
                  </p>
                )}
                <p className="confirm-instruction">
                  To confirm, please type <strong>"DELETE"</strong> in the box below:
                </p>
                <input
                  type="text"
                  className="confirm-input"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  autoFocus
                />
              </div>
              <div className="clear-confirm-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelClear}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleConfirmClear}
                  disabled={loading || confirmText !== 'DELETE'}
                >
                  {loading ? 'Clearing...' : 'Clear All Orders'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AdminDashboard;

