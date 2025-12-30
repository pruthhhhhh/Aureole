/**
 * Payment Success Component
 * Displays success message after payment verification
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderStatus, setOrderStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const audioContextRef = useRef(null);

  const orderId = searchParams.get('orderId');

  // Function to play buzzer beep sound
  const playBuzzerBeep = () => {
    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Configure buzzer sound (high frequency beep)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1); // 1000 Hz
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2); // Back to 800 Hz

      // Configure volume (gain)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Play the beep
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // Play second beep after short delay
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.2);
      }, 350);
    } catch (error) {
      console.error('Error playing buzzer sound:', error);
      // Fallback: Use Web Audio API with a simpler approach
      try {
        const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZURE=');
        beep.volume = 0.3;
        beep.play().catch(err => console.error('Audio play failed:', err));
      } catch (e) {
        console.error('Fallback audio failed:', e);
      }
    }
  };

  const handleDispense = async () => {
    if (!orderId || dispensing) return;

    try {
      setDispensing(true);

      // Play buzzer beep sound
      playBuzzerBeep();

      // Trigger dispense on backend
      console.log('Triggering dispense for order:', orderId);
      const response = await orderAPI.triggerDispense(orderId);
      console.log('Trigger dispense response:', response);

      if (response && response.success) {
        // Refresh status immediately to show that it's authorized
        await checkOrderStatus();
        setPolling(true);
        setDispensing(false); // Reset loading state
      } else {
        const errorMsg = response?.message || 'Unknown error';
        alert(`Failed to trigger dispense: ${errorMsg}`);
        setDispensing(false);
      }
    } catch (err) {
      console.error('❌ Error triggering dispense:', err);
      const errorMessage = err.message || 'Failed to trigger dispense';
      alert(`Failed to trigger dispense: ${errorMessage}`);
      setDispensing(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      checkOrderStatus();
      // Poll for dispensing status
      const interval = setInterval(() => {
        if (polling) {
          checkOrderStatus();
        }
      }, 3000);

      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [orderId, polling]);

  const checkOrderStatus = async () => {
    try {
      const response = await orderAPI.getStatus(orderId);
      setOrderStatus(response.data);
      setLoading(false);

      // Stop polling if dispensing is completed or failed
      if (
        response.data.dispensingStatus === 'completed' ||
        response.data.dispensingStatus === 'failed'
      ) {
        setPolling(false);
      }
    } catch (err) {
      console.error('Error checking order status:', err);
      // We don't setLoading(false) or setPolling(false) here 
      // because we want to keep trying if it's just a temporary network error
    }
  };

  if (loading) {
    return (
      <div className="payment-success">
        <div className="success-container">
          <div className="spinner"></div>
          <p>Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (!orderStatus) {
    return (
      <div className="payment-success">
        <div className="success-container">
          <div className="alert alert-error">
            Order not found
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/payment')}>
            Go to Payment Page
          </button>
        </div>
      </div>
    );
  }

  const isOrderDispensing = orderStatus.dispensingStatus === 'in_progress';
  const isCompleted = orderStatus.dispensingStatus === 'completed';
  const isFailed = orderStatus.dispensingStatus === 'failed';
  const isPending = orderStatus.dispensingStatus === 'pending';

  return (
    <div className="payment-success">
      <div className="success-container">
        {orderStatus.paymentStatus === 'completed' ? (
          <>
            <div className="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p className="success-message">
              Your payment of ₹{orderStatus.amount} has been verified.
            </p>

            {isPending && (
              <div className="status-card">
                <p>Payment received! Ready to dispense your perfume.</p>
                <button
                  className={`btn btn-primary ${dispensing ? 'loading' : ''}`}
                  onClick={handleDispense}
                  disabled={dispensing}
                >
                  {dispensing ? 'Starting...' : 'Dispense Perfume Now'}
                </button>
              </div>
            )}

            {isOrderDispensing && (
              <div className="status-card">
                <div className="status-icon dispensing">
                  <div className="spinner-small"></div>
                </div>
                <h2>Dispensing in Progress</h2>
                <p>Please wait while your perfume is being dispensed...</p>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={checkOrderStatus}
                  style={{ marginTop: '10px' }}
                >
                  🔄 Refresh Status
                </button>
              </div>
            )}

            {isCompleted && (
              <div className="status-card">
                <div className="status-icon completed">✓</div>
                <h2>Dispensing Completed!</h2>
                <p>Enjoy your perfume! Thank you for your purchase.</p>
              </div>
            )}

            {isFailed && (
              <div className="status-card">
                <div className="status-icon failed">✗</div>
                <h2>Dispensing Failed</h2>
                <p>{orderStatus.errorMessage || 'An error occurred during dispensing.'}</p>
                <p className="support-text">
                  Please contact support with your Order ID: {orderStatus.orderId}
                </p>
              </div>
            )}

            <div className="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> {orderStatus.orderId}</p>
              <p><strong>Amount:</strong> ₹{orderStatus.amount}</p>
              <p><strong>Payment Status:</strong> {orderStatus.paymentStatus}</p>
              <p><strong>Dispensing Status:</strong> {orderStatus.dispensingStatus}</p>
            </div>
          </>
        ) : (
          <>
            <div className="success-icon failed">✗</div>
            <h1>Payment Verification Failed</h1>
            <p className="error-message">
              We couldn't verify your payment. Please contact support.
            </p>
            <div className="order-details">
              <p><strong>Order ID:</strong> {orderStatus.orderId}</p>
            </div>
          </>
        )}

        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Make Another Purchase
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

