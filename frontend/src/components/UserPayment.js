/**
 * User Payment Component
 * Handles QR code display and Razorpay payment integration
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { orderAPI } from '../services/api';
import './UserPayment.css';

const UserPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Get data from Home component navigation state
  const perfume = location.state?.perfume;
  const sprays = location.state?.sprays || 1;
  const amount = location.state?.amount || 30;

  const orderIdFromUrl = searchParams.get('orderId');

  useEffect(() => {
    // If orderId is in URL, fetch order details
    if (orderIdFromUrl) {
      fetchOrderDetails(orderIdFromUrl);
    } else if (!perfume && !orderIdFromUrl) {
      setLoading(false);
    }
  }, [orderIdFromUrl]);

  // Auto-create order when coming from Home (only once)
  useEffect(() => {
    if (perfume && amount && !orderData && !orderIdFromUrl && !isCreatingOrder) {
      createOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfume, amount]);

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await orderAPI.getStatus(orderId);
      setOrderData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Order not found');
      setLoading(false);
    }
  };

  const createOrder = async () => {
    // Prevent multiple simultaneous order creations
    if (isCreatingOrder) {
      console.log('Order creation already in progress, skipping...');
      return;
    }

    try {
      setIsCreatingOrder(true);
      setLoading(true);
      setError(null);

      const response = await orderAPI.createOrder(amount, sprays, perfume?.id, perfume?.name);

      // Check if response has data (successful)
      if (response.data) {
        setOrderData(response.data);
        setLoading(false);
        return;
      }

      // If no data but success is false, check for demo mode
      if (!response.success && response.demo) {
        // Create a demo order for testing UI
        const demoOrder = {
          orderId: `DEMO_${Date.now()}`,
          razorpayOrderId: `demo_order_${Date.now()}`,
          amount: amount,
          currency: 'INR',
          key: 'demo_key',
          name: 'AUREOLE',
          description: `${sprays} spray(s) of ${perfume?.name || 'premium perfume'}`,
          prefill: {
            email: '',
            contact: '',
          },
        };
        setOrderData(demoOrder);
        setError('⚠️ Demo Mode: Razorpay keys not configured. This is a demo order. Add Razorpay keys to backend/.env for real payments.');
        setLoading(false);
        return;
      }

      setOrderData(response.data || response);
      setLoading(false);
    } catch (err) {
      console.error('Error creating order:', err);

      // If payment service not configured, create demo order
      if (err.response?.status === 503 && err.response?.data?.demo) {
        const demoOrder = {
          orderId: `DEMO_${Date.now()}`,
          razorpayOrderId: `demo_order_${Date.now()}`,
          amount: amount,
          currency: 'INR',
          key: 'demo_key',
          name: 'AUREOLE',
          description: `${sprays} spray(s) of ${perfume?.name || 'premium perfume'}`,
          prefill: {
            email: '',
            contact: '',
          },
        };
        setOrderData(demoOrder);
        setError('⚠️ Demo Mode: Razorpay keys not configured. This is a demo order. Add Razorpay keys to backend/.env for real payments.');
        setLoading(false);
      } else {
        // For any other error, still create demo order so UI works
        const demoOrder = {
          orderId: `DEMO_${Date.now()}`,
          razorpayOrderId: `demo_order_${Date.now()}`,
          amount: amount,
          currency: 'INR',
          key: 'demo_key',
          name: 'AUREOLE',
          description: `${sprays} spray(s) of ${perfume?.name || 'premium perfume'}`,
          prefill: {
            email: '',
            contact: '',
          },
        };
        setOrderData(demoOrder);
        setError(`⚠️ Demo Mode: ${err.response?.data?.message || 'Payment service not configured. This is a demo order.'}`);
        setLoading(false);
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCashPayment = async () => {
    // Prevent multiple simultaneous payment processing
    if (isProcessingPayment) {
      console.log('Payment already processing, please wait...');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setLoading(true);
      setError(null);

      // Use amount and sprays from props (from Home) or orderData
      const paymentAmount = amount || orderData?.amount;
      const paymentSprays = sprays || orderData?.spraysRequested || 1;

      console.log('Cash Payment - Amount:', paymentAmount, 'Sprays:', paymentSprays);

      if (!paymentAmount || paymentAmount < 1) {
        setError('Please select a perfume and amount first');
        setLoading(false);
        setIsProcessingPayment(false);
        return;
      }

      // Process cash payment
      console.log('Calling cash payment API...');
      console.log('Request payload:', { amount: paymentAmount, sprays: paymentSprays });

      // Make sure we're sending numbers, not strings
      const response = await orderAPI.cashPayment(
        Number(paymentAmount),
        Number(paymentSprays),
        perfume?.id,
        perfume?.name
      );
      console.log('Cash payment response:', response);

      if (response && response.success) {
        // Redirect to success page
        console.log('Cash payment successful, redirecting...');
        navigate(`/payment-success?orderId=${response.data.orderId}`);
      } else {
        setError(response?.message || 'Cash payment failed');
        setLoading(false);
        setIsProcessingPayment(false);
      }
    } catch (err) {
      console.error('Cash payment error:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Cash payment failed. Please try again.';
      setError(errorMessage);
      setLoading(false);
      setIsProcessingPayment(false);
    }
  };

  const handlePayment = async () => {
    if (!orderData) {
      setError('Please create an order first');
      return;
    }

    // Check if it's a demo order
    if (orderData.key === 'demo_key' || orderData.orderId?.startsWith('DEMO_')) {
      setError('⚠️ Demo Mode: Cannot process payment. Please configure Razorpay keys in backend/.env file to enable real payments.');
      return;
    }

    const razorpayLoaded = await loadRazorpayScript();
    if (!razorpayLoaded) {
      setError('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    const options = {
      key: orderData.key,
      amount: orderData.amount * 100, // Convert to paise
      currency: orderData.currency,
      name: orderData.name,
      description: orderData.description,
      order_id: orderData.razorpayOrderId,
      handler: async function (response) {
        // Payment successful
        try {
          // Verify payment on server
          await orderAPI.verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          // Redirect to success page
          navigate(`/payment-success?orderId=${orderData.orderId}`);
        } catch (err) {
          console.error('Payment verification failed:', err);
          setError('Payment verification failed. Please contact support.');
        }
      },
      prefill: {
        email: orderData.prefill?.email || '',
        contact: orderData.prefill?.contact || '',
      },
      theme: {
        color: '#ffffff',
      },
      modal: {
        ondismiss: function () {
          setError('Payment cancelled');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const generateQRCodeUrl = () => {
    if (!orderData) return '';
    const currentUrl = window.location.origin;
    return `${currentUrl}/payment?orderId=${orderData.orderId}`;
  };

  if (loading && !orderData) {
    return (
      <div className="user-payment">
        <div className="payment-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-payment">
      <div className="payment-container">
        <div className="payment-card">
          <div className="payment-logo">
            <img
              src={process.env.PUBLIC_URL + '/images/aureole-logo.png'}
              alt="AUREOLE"
              onError={(e) => {
                console.error('Logo failed to load, trying fallback');
                e.target.src = '/images/aureole-logo.png';
              }}
            />
          </div>
          <p className="subtitle">Scan QR code or pay directly</p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Processing payment...</p>
            </div>
          ) : orderData || (perfume && amount) ? (
            // Payment Interface
            <div className="payment-interface">
              {perfume && (
                <div className="perfume-selection-info">
                  <div className="perfume-icon-large">
                    <img src={perfume.image} alt={perfume.name} onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                  <div className="perfume-text-info">
                    <h3>{perfume.name}</h3>
                    <p>{perfume.description}</p>
                  </div>
                </div>
              )}

              <div className="order-details-section">
                <h2 className="order-details-title">Order Details</h2>
                <div className="order-details-card">
                  {orderData && (
                    <div className="order-detail-row">
                      <span className="order-detail-label">Order ID</span>
                      <span className="order-detail-value order-id">{orderData.orderId}</span>
                    </div>
                  )}
                  <div className="order-detail-row">
                    <span className="order-detail-label">Perfume</span>
                    <span className="order-detail-value">{perfume?.name || 'Selected Perfume'}</span>
                  </div>
                  <div className="order-detail-row">
                    <span className="order-detail-label">Sprays</span>
                    <span className="order-detail-value">{sprays} spray{sprays !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="order-detail-row order-total">
                    <span className="order-detail-label">Total Amount</span>
                    <span className="order-detail-value total-amount">₹{orderData?.amount || amount}</span>
                  </div>
                </div>
              </div>

              {orderData && !orderData.orderId?.startsWith('DEMO_') && !orderData.orderId?.startsWith('CASH_') && (
                <div className="qr-section">
                  <h3>Scan QR Code</h3>
                  <div className="qr-code-container">
                    <QRCodeSVG
                      value={generateQRCodeUrl()}
                      size={256}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <p className="qr-hint">Scan with your phone to complete payment</p>
                </div>
              )}

              <div className="payment-buttons">
                <button
                  className="btn btn-success btn-large"
                  onClick={handleCashPayment}
                  disabled={loading || isProcessingPayment}
                >
                  {isProcessingPayment ? 'Processing...' : '💵 Pay with Cash (Testing)'}
                </button>
                {orderData && orderData.key !== 'demo_key' && !orderData.orderId?.startsWith('DEMO_') && (
                  <button
                    className="btn btn-primary btn-large"
                    onClick={handlePayment}
                    disabled={loading}
                  >
                    Pay Now with Razorpay
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    navigate('/');
                  }}
                  disabled={loading}
                >
                  Select Different Perfume
                </button>
              </div>
            </div>
          ) : (
            <div className="no-order-state">
              <p>No order data available. Please select a perfume from the home page.</p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Go to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPayment;

