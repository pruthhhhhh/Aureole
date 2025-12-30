# Backend API Server

Express.js backend for Perfume Dispensing Machine with Razorpay integration.

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Fill in your configuration:
   - Razorpay keys (from Razorpay dashboard)
   - MongoDB connection string
   - JWT secret (generate a random string)
   - Port number

## Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Order Management
- `POST /api/create-order` - Create Razorpay order
- `POST /api/verify-payment` - Verify payment signature
- `POST /api/trigger-dispense` - Get dispense command (microcontroller)
- `POST /api/confirm-dispense` - Confirm dispense completion
- `GET /api/get-status/:orderId` - Get order status

### System Management
- `GET /api/system/status` - Get system status
- `PUT /api/system/status` - Update system status
- `GET /api/system/statistics` - Get statistics (requires auth)
- `GET /api/system/orders` - Get recent orders (requires auth)

## Health Check

```bash
curl http://localhost:3000/health
```

## Database

MongoDB collections are created automatically on first use:
- `orders` - Payment and dispensing orders
- `systemstatus` - Machine status and statistics
- `users` - Admin users (optional)

## Testing

Use Razorpay test mode for development:
- Test card: `4111 1111 1111 1111`
- Any future expiry date
- Any CVV

