# System Architecture - Perfume Dispensing Machine

## Overview

The Perfume Dispensing Machine is an IoT-based payment system that allows users to purchase and receive perfume sprays through a QR code payment flow. The system consists of four main components:

1. **Backend API Server** (Node.js/Express)
2. **Microcontroller Firmware** (ESP32)
3. **Admin Dashboard** (React Web Application)
4. **User Payment Interface** (React Web Application)

---

## System Components

### 1. Backend API Server

**Technology Stack:**
- Node.js with Express.js framework
- MongoDB database
- Razorpay payment gateway integration
- JWT authentication

**Key Responsibilities:**
- Order creation and management
- Payment verification
- Dispensing command generation
- System status tracking
- Statistics and analytics

**API Endpoints:**
```
POST   /api/create-order          - Create Razorpay order
POST   /api/verify-payment        - Verify payment signature
POST   /api/trigger-dispense      - Get pending dispense commands (microcontroller)
POST   /api/confirm-dispense      - Confirm dispense completion (microcontroller)
GET    /api/get-status/:orderId   - Get order status
GET    /api/system/status         - Get system status
PUT    /api/system/status         - Update system status (microcontroller)
GET    /api/system/statistics     - Get statistics (admin)
GET    /api/system/orders         - Get recent orders (admin)
```

### 2. Microcontroller (ESP32)

**Hardware:**
- ESP32-WROOM-32 development board
- Peristaltic or Solenoid pump
- Relay module (if needed)
- Optional: Liquid level sensor

**Key Responsibilities:**
- WiFi connectivity
- API polling for dispense commands
- Pump control (GPIO)
- Status reporting to server
- Error handling and safety checks

**Communication Flow:**
1. Connects to WiFi on startup
2. Polls `/api/trigger-dispense` every 3 seconds
3. Receives dispense command with pump duration
4. Activates pump for specified duration
5. Sends confirmation to `/api/confirm-dispense`
6. Updates system status every 30 seconds

### 3. Admin Dashboard

**Technology Stack:**
- React.js
- Axios for API calls
- Recharts for data visualization

**Features:**
- Real-time system status monitoring
- Sales and revenue statistics
- Perfume level tracking
- Recent orders list
- Failed transactions tracking
- Auto-refresh every 5 seconds

### 4. User Payment Interface

**Technology Stack:**
- React.js
- Razorpay Checkout SDK
- QR Code generation

**Features:**
- Order creation
- QR code display
- Razorpay payment integration
- Payment verification
- Real-time dispensing status
- Success/failure notifications

---

## Data Flow Diagrams

### 1. Complete Payment and Dispensing Flow

```
┌─────────────┐
│   User      │
│  (Mobile)   │
└──────┬──────┘
       │
       │ 1. Scan QR Code
       │    or Visit Payment Page
       ▼
┌─────────────────────┐
│  Frontend (React)   │
│  User Payment Page  │
└──────┬──────────────┘
       │
       │ 2. POST /api/create-order
       │    { amount, sprays }
       ▼
┌─────────────────────┐
│  Backend API        │
│  (Express.js)       │
└──────┬──────────────┘
       │
       │ 3. Create Razorpay Order
       │    Save to MongoDB
       │
       │ 4. Return order details
       │    + Razorpay config
       ▼
┌─────────────────────┐
│  Frontend           │
│  (Payment Page)     │
└──────┬──────────────┘
       │
       │ 5. Display QR Code
       │    Load Razorpay SDK
       │
       │ 6. User clicks "Pay Now"
       │    Razorpay Checkout opens
       │
       │ 7. User completes payment
       │    Razorpay returns payment details
       │
       │ 8. POST /api/verify-payment
       │    { order_id, payment_id, signature }
       ▼
┌─────────────────────┐
│  Backend API        │
│  (Express.js)       │
└──────┬──────────────┘
       │
       │ 9. Verify signature
       │    Update order status
       │    Update statistics
       │
       │ 10. Return success
       ▼
┌─────────────────────┐
│  Frontend           │
│  (Success Page)     │
└─────────────────────┘
       │
       │ 11. Display success message
       │     Poll for dispensing status
       │
       │
       │ (Parallel Process)
       │
       ▼
┌─────────────────────┐
│  ESP32              │
│  (Microcontroller)  │
└──────┬──────────────┘
       │
       │ 12. Poll /api/trigger-dispense
       │     (every 3 seconds)
       │
       │ 13. Receive dispense command
       │     { orderId, pumpDurationMs }
       │
       │ 14. Activate pump
       │     digitalWrite(PUMP_PIN, HIGH)
       │     delay(pumpDurationMs)
       │     digitalWrite(PUMP_PIN, LOW)
       │
       │ 15. POST /api/confirm-dispense
       │     { orderId, status: "success" }
       ▼
┌─────────────────────┐
│  Backend API        │
│  (Express.js)       │
└──────┬──────────────┘
       │
       │ 16. Update order status
       │     Update statistics
       │     Decrease perfume level
       │
       │ 17. Frontend polls /api/get-status
       │     Shows "Dispensing Completed"
       ▼
┌─────────────────────┐
│  User sees          │
│  "Completed" status │
└─────────────────────┘
```

### 2. Microcontroller Polling Flow

```
┌─────────────────────┐
│  ESP32              │
│  (Main Loop)        │
└──────┬──────────────┘
       │
       │ Every 3 seconds
       │
       │ POST /api/trigger-dispense
       │ {}
       ▼
┌─────────────────────┐
│  Backend API        │
│  (Express.js)       │
└──────┬──────────────┘
       │
       │ Query MongoDB:
       │ Find oldest order where:
       │   paymentStatus = "completed"
       │   dispensingStatus = "pending"
       │
       │ If found:
       │   Return { hasOrder: true, data: {...} }
       │ If not found:
       │   Return { hasOrder: false }
       │
       ▼
┌─────────────────────┐
│  ESP32              │
│  (Process Response) │
└──────┬──────────────┘
       │
       │ If hasOrder:
       │   1. Check liquid level
       │   2. Check machine status
       │   3. Execute dispense
       │   4. POST /api/confirm-dispense
       │
       │ Every 30 seconds:
       │   PUT /api/system/status
       │   { machineStatus, perfumeLevel }
       │
       │ Loop continues...
```

### 3. Error Handling Flow

```
┌─────────────────────┐
│  Error Occurs       │
└──────┬──────────────┘
       │
       ├─ Payment Verification Failed
       │  └─> Order marked as "failed"
       │  └─> Failed transactions count++
       │  └─> User sees error message
       │
       ├─ Dispensing Failed (Low Liquid)
       │  └─> Order dispensingStatus = "failed"
       │  └─> Error message saved
       │  └─> User notified on success page
       │
       ├─ Microcontroller Offline
       │  └─> Orders queue up
       │  └─> Admin dashboard shows "offline"
       │  └─> ESP32 reconnects automatically
       │
       ├─ API Server Down
       │  └─> ESP32 retries connection
       │  └─> Frontend shows error
       │  └─> Admin dashboard unavailable
       │
       └─ Network Timeout
          └─> ESP32 retries with backoff
          └─> Order remains in queue
          └─> Admin can manually retry
```

---

## Database Schema

### Order Collection

```javascript
{
  _id: ObjectId,
  razorpayOrderId: String (unique),
  razorpayPaymentId: String,
  razorpaySignature: String,
  orderId: String (unique),
  amount: Number,
  currency: String (default: "INR"),
  paymentStatus: String (enum: ["pending", "completed", "failed", "refunded"]),
  dispensingStatus: String (enum: ["pending", "in_progress", "completed", "failed"]),
  spraysRequested: Number,
  pumpDurationMs: Number,
  microcontrollerAcknowledged: Boolean,
  microcontrollerResponse: String,
  dispenseTriggeredAt: Date,
  dispenseCompletedAt: Date,
  errorMessage: String,
  retryCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### SystemStatus Collection

```javascript
{
  _id: ObjectId,
  perfumeLevel: Number (0-100),
  machineStatus: String (enum: ["online", "offline", "maintenance", "error"]),
  totalSales: Number,
  totalRevenue: Number,
  totalSpraysDispensed: Number,
  failedTransactions: Number,
  lastMicrocontrollerPing: Date,
  lastDispenseTime: Date,
  lastError: String,
  lastErrorTime: Date,
  updatedAt: Date
}
```

### User Collection (Optional - for Admin Auth)

```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ["admin", "operator"]),
  createdAt: Date
}
```

---

## Security Considerations

### 1. Payment Security
- Razorpay signature verification using HMAC-SHA256
- Payment details never stored in plain text
- HTTPS required for production

### 2. API Security
- JWT authentication for admin endpoints
- CORS configuration
- Input validation and sanitization
- Rate limiting (recommended)

### 3. Microcontroller Security
- API endpoints should use authentication tokens
- HTTPS for production (requires SSL certificate)
- Secure WiFi credentials storage

### 4. Database Security
- MongoDB authentication enabled
- Connection string stored in environment variables
- Regular backups recommended

---

## Scalability Considerations

### Current Architecture
- Single ESP32 per machine
- Single backend server
- MongoDB database

### Future Enhancements
1. **Multiple Machines:**
   - Add `machineId` field to orders
   - Load balancing for API requests
   - Machine-specific status tracking

2. **High Availability:**
   - MongoDB replica set
   - Backend server clustering
   - Redis for session management

3. **Real-time Updates:**
   - WebSocket connections for live updates
   - Server-Sent Events (SSE)
   - MQTT for IoT communication

---

## Logging System

### Backend Logging
- Console logging for development
- File logging for production (recommended: Winston)
- Log levels: ERROR, WARN, INFO, DEBUG

### Microcontroller Logging
- Serial output for debugging
- Error messages sent to server
- Status updates logged to database

### Frontend Logging
- Console logging for development
- Error tracking service (e.g., Sentry) for production

---

## Monitoring and Alerts

### Key Metrics to Monitor
1. API response times
2. Payment success rate
3. Dispensing success rate
4. Machine uptime
5. Perfume level
6. Failed transactions

### Alert Triggers
1. Machine offline for > 5 minutes
2. Perfume level < 10%
3. Failed transactions > 5 in last hour
4. API server down
5. Database connection lost

---

## Sequence Diagram

```
User          Frontend        Backend         Razorpay      ESP32
 │               │               │               │            │
 │─Scan QR──────>│               │               │            │
 │               │─Create Order─>│               │            │
 │               │               │─Create Order─>│            │
 │               │<─Order Data───│<─Order ID────│            │
 │<─QR Code──────│               │               │            │
 │               │               │               │            │
 │─Pay Now──────>│               │               │            │
 │               │               │               │            │
 │<─Checkout─────│               │               │            │
 │               │               │               │            │
 │─Complete──────│               │               │            │
 │  Payment      │               │               │            │
 │               │─Verify───────>│               │            │
 │               │               │─Verify───────>│            │
 │               │               │<─Verified─────│            │
 │               │<─Success──────│               │            │
 │<─Success──────│               │               │            │
 │               │               │               │            │
 │               │               │               │<─Poll──────│
 │               │               │<─Trigger──────│            │
 │               │               │─Dispense──────>│            │
 │               │               │               │            │
 │               │               │               │─Pump ON───>│
 │               │               │               │            │
 │               │               │               │─Pump OFF──>│
 │               │               │               │            │
 │               │               │<─Confirm──────│            │
 │               │               │               │            │
 │─Check Status─>│─Get Status───>│               │            │
 │               │<─Completed────│               │            │
 │<─Completed────│               │               │            │
```

---

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend | Node.js + Express | API server |
| Database | MongoDB | Data storage |
| Payment | Razorpay | Payment gateway |
| Microcontroller | ESP32 (Arduino) | Hardware control |
| Frontend | React.js | Web interface |
| Authentication | JWT | Admin access |
| QR Codes | qrcode.react | QR generation |

---

## Network Architecture

```
                    Internet
                       │
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        │              │              │
    ┌───▼───┐    ┌─────▼─────┐   ┌────▼────┐
    │Admin  │    │  User     │   │  User   │
    │Browser│    │  Mobile   │   │  Mobile │
    └───┬───┘    └─────┬─────┘   └────┬────┘
        │              │              │
        │              │              │
        └──────────────┼──────────────┘
                       │
                       │ HTTPS
                       │
                ┌──────▼──────┐
                │   Backend   │
                │   Server    │
                │  (Express)  │
                └──────┬──────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        │              │              │
    ┌───▼───┐    ┌─────▼─────┐   ┌────▼────┐
    │MongoDB│    │ Razorpay  │   │  ESP32  │
    │       │    │   API     │   │(WiFi)   │
    └───────┘    └───────────┘   └────┬────┘
                                      │
                                      │
                                 ┌────▼────┐
                                 │  Pump   │
                                 │ Control │
                                 └─────────┘
```

---

This architecture provides a robust, scalable foundation for the Perfume Dispensing Machine system with clear separation of concerns and well-defined communication protocols.

