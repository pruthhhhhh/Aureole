# Troubleshooting Guide - Perfume Dispensing Machine

This guide helps you diagnose and fix common issues with the Perfume Dispensing Machine system.

---

## Table of Contents

1. [Backend Issues](#backend-issues)
2. [Frontend Issues](#frontend-issues)
3. [Microcontroller Issues](#microcontroller-issues)
4. [Payment Issues](#payment-issues)
5. [Database Issues](#database-issues)
6. [Network Issues](#network-issues)
7. [Hardware Issues](#hardware-issues)

---

## Backend Issues

### Server Won't Start

**Symptoms:**
- Error when running `npm start`
- Port already in use
- MongoDB connection failed

**Solutions:**

1. **Port Already in Use:**
   ```bash
   # Find process using port 3000
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -i :3000
   kill -9 <PID>
   
   # Or change PORT in .env file
   ```

2. **MongoDB Connection Failed:**
   ```bash
   # Check if MongoDB is running
   # Windows
   net start MongoDB
   
   # Linux
   sudo systemctl status mongod
   sudo systemctl start mongod
   
   # Verify connection string in .env
   MONGODB_URI=mongodb://localhost:27017/perfume_dispensing
   ```

3. **Missing Dependencies:**
   ```bash
   npm install
   ```

4. **Environment Variables Missing:**
   - Ensure `.env` file exists
   - Check all required variables are set
   - Restart server after changing `.env`

### API Endpoints Not Responding

**Symptoms:**
- 404 errors
- CORS errors
- Timeout errors

**Solutions:**

1. **Check Server Status:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check Routes:**
   - Verify route paths match frontend calls
   - Check route files are imported in `server.js`

3. **CORS Issues:**
   - Verify CORS middleware is enabled
   - Check allowed origins in `server.js`
   - For production, add your domain to allowed origins

4. **Check PM2 Status:**
   ```bash
   pm2 status
   pm2 logs perfume-api
   ```

### Payment Verification Failing

**Symptoms:**
- "Signature verification failed" error
- Payments not being marked as completed

**Solutions:**

1. **Check Razorpay Keys:**
   ```bash
   # Verify in .env file
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```

2. **Verify Signature Algorithm:**
   - Ensure using HMAC-SHA256
   - Check signature generation matches Razorpay format

3. **Test with Razorpay Dashboard:**
   - Check payment status in Razorpay dashboard
   - Verify webhook events (if configured)

4. **Check Order in Database:**
   ```javascript
   // In MongoDB shell
   use perfume_dispensing
   db.orders.find({ paymentStatus: "pending" })
   ```

---

## Frontend Issues

### React App Won't Start

**Symptoms:**
- `npm start` fails
- Port 3000 already in use
- Module not found errors

**Solutions:**

1. **Port Conflict:**
   ```bash
   # Use different port
   PORT=3001 npm start
   
   # Or kill process on port 3000
   ```

2. **Missing Dependencies:**
   ```bash
   npm install
   ```

3. **Clear Cache:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### API Calls Failing

**Symptoms:**
- Network errors
- CORS errors
- 404 errors

**Solutions:**

1. **Check API URL:**
   ```javascript
   // In .env file
   REACT_APP_API_URL=http://localhost:3000/api
   ```

2. **Verify Backend Running:**
   - Check backend server is running
   - Test API endpoint directly in browser

3. **Check CORS:**
   - Backend must allow frontend origin
   - Verify CORS middleware configuration

4. **Browser Console:**
   - Open DevTools → Network tab
   - Check request/response details
   - Look for error messages

### QR Code Not Displaying

**Symptoms:**
- QR code component not rendering
- Blank space where QR should be

**Solutions:**

1. **Check Library Installation:**
   ```bash
   npm install qrcode.react
   ```

2. **Verify Import:**
   ```javascript
   import { QRCodeSVG } from 'qrcode.react';
   ```

3. **Check URL Format:**
   - Ensure URL is valid
   - Test URL in browser

### Payment Modal Not Opening

**Symptoms:**
- Razorpay checkout not appearing
- JavaScript errors

**Solutions:**

1. **Check Razorpay SDK:**
   - Verify script loads: `https://checkout.razorpay.com/v1/checkout.js`
   - Check browser console for errors

2. **Verify Order Data:**
   - Check order creation successful
   - Verify Razorpay key is correct

3. **Check Browser Console:**
   - Look for JavaScript errors
   - Verify all required data present

---

## Microcontroller Issues

### WiFi Not Connecting

**Symptoms:**
- "WiFi Connection Failed" in Serial Monitor
- ESP32 stuck in connection loop

**Solutions:**

1. **Check Credentials:**
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";  // Case sensitive
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

2. **Check WiFi Signal:**
   - Move ESP32 closer to router
   - Check RSSI value in Serial Monitor
   - Ensure 2.4GHz network (ESP32 doesn't support 5GHz)

3. **Check Router Settings:**
   - Ensure WiFi is enabled
   - Check MAC address filtering
   - Verify password is correct

4. **Reset ESP32:**
   - Press reset button
   - Re-upload firmware

### API Requests Failing

**Symptoms:**
- "API Request Failed" in Serial Monitor
- HTTP error codes (404, 500, etc.)

**Solutions:**

1. **Check API URL:**
   ```cpp
   const char* apiBaseUrl = "http://your-server-ip:3000/api";
   // For production: "https://your-domain.com/api"
   ```

2. **Verify Server Running:**
   - Test API endpoint in browser
   - Check server logs

3. **Check Network:**
   - ESP32 and server on same network (for local testing)
   - Firewall not blocking requests
   - Port 3000 accessible

4. **HTTPS Issues:**
   - ESP32 may need SSL certificate
   - For testing, use HTTP
   - For production, add certificate to firmware

### Pump Not Activating

**Symptoms:**
- Dispense command received but pump doesn't run
- No physical output

**Solutions:**

1. **Check Wiring:**
   - Verify PUMP_PIN connection
   - Check power supply to pump
   - Verify relay connections (if using relay)

2. **Check Pin Configuration:**
   ```cpp
   const int PUMP_PIN = 2;  // Verify this matches your wiring
   ```

3. **Test Pump Directly:**
   - Connect pump directly to power supply
   - Verify pump works independently

4. **Check Serial Monitor:**
   - Look for "Starting Dispense" message
   - Verify pump duration value
   - Check for error messages

5. **Power Supply:**
   - Ensure adequate current (1-2A for pump)
   - Check voltage matches pump requirements
   - Use separate power supply if needed

### Liquid Level Sensor Issues

**Symptoms:**
- Incorrect level readings
- Level not updating

**Solutions:**

1. **Calibrate Sensor:**
   ```cpp
   // Adjust map values based on your sensor
   perfumeLevel = map(sensorValue, 0, 4095, 0, 100);
   ```

2. **Check Wiring:**
   - Verify analog pin connection
   - Check ground connection
   - Ensure 3.3V supply

3. **Test Sensor:**
   - Read raw analog value in Serial Monitor
   - Test with known liquid levels
   - Adjust calibration values

---

## Payment Issues

### Payment Not Processing

**Symptoms:**
- Payment modal opens but payment fails
- "Payment verification failed" error

**Solutions:**

1. **Check Razorpay Keys:**
   - Verify test/live keys match environment
   - Check keys in backend `.env` file

2. **Check Amount:**
   - Minimum amount: ₹1
   - Amount in paise (multiply by 100)

3. **Verify Signature:**
   - Check signature verification logic
   - Ensure using correct secret key

4. **Test Mode:**
   - Use Razorpay test cards
   - Test card: 4111 1111 1111 1111
   - Any future expiry, any CVV

### Order Not Created

**Symptoms:**
- "Failed to create order" error
- No order in database

**Solutions:**

1. **Check Backend Logs:**
   ```bash
   pm2 logs perfume-api
   # or
   npm run dev  # for development
   ```

2. **Verify Razorpay Connection:**
   - Test Razorpay API directly
   - Check network connectivity

3. **Check Database:**
   - Verify MongoDB running
   - Check connection string
   - Verify write permissions

---

## Database Issues

### MongoDB Connection Failed

**Symptoms:**
- "MongoDB Connection Error" in logs
- Database operations fail

**Solutions:**

1. **Check MongoDB Running:**
   ```bash
   # Windows
   net start MongoDB
   
   # Linux
   sudo systemctl status mongod
   sudo systemctl start mongod
   ```

2. **Verify Connection String:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/perfume_dispensing
   # Or with authentication:
   MONGODB_URI=mongodb://username:password@localhost:27017/perfume_dispensing
   ```

3. **Check Firewall:**
   - Ensure port 27017 not blocked
   - Check MongoDB bind IP settings

4. **Test Connection:**
   ```bash
   mongo
   use perfume_dispensing
   db.orders.find()
   ```

### Data Not Saving

**Symptoms:**
- Orders not appearing in database
- Statistics not updating

**Solutions:**

1. **Check Write Permissions:**
   - Verify MongoDB user has write access
   - Check database exists

2. **Check Error Logs:**
   - Review server logs for errors
   - Check MongoDB logs

3. **Verify Models:**
   - Check model schemas
   - Verify field names match

---

## Network Issues

### ESP32 Can't Reach Server

**Symptoms:**
- "API Request Failed" errors
- Connection timeout

**Solutions:**

1. **Check Server IP:**
   - Verify server IP address
   - Use `ifconfig` or `ipconfig` to find IP

2. **Check Firewall:**
   ```bash
   # Linux
   sudo ufw allow 3000
   
   # Windows
   # Allow port 3000 in Windows Firewall
   ```

3. **Test Connectivity:**
   ```bash
   # From ESP32 network, test:
   curl http://server-ip:3000/health
   ```

4. **Check Router Settings:**
   - Ensure devices on same network
   - Check for network isolation

### HTTPS Certificate Issues

**Symptoms:**
- ESP32 can't connect to HTTPS endpoint
- SSL verification errors

**Solutions:**

1. **For Testing:**
   - Use HTTP instead of HTTPS
   - Only for local network testing

2. **For Production:**
   - Add SSL certificate to ESP32 firmware
   - Use `WiFiClientSecure` instead of `WiFiClient`
   - Include root CA certificate

---

## Hardware Issues

### Pump Not Working

**Symptoms:**
- No physical output
- Pump doesn't activate

**Solutions:**

1. **Check Power Supply:**
   - Verify voltage (usually 12V)
   - Check current capacity (1-2A)
   - Test with multimeter

2. **Check Wiring:**
   - Verify positive/negative connections
   - Check relay connections (if using)
   - Ensure proper grounding

3. **Test Pump:**
   - Connect directly to power supply
   - Verify pump works independently
   - Check for mechanical issues

4. **Check Relay:**
   - Test relay with LED
   - Verify relay trigger voltage
   - Check relay ratings

### ESP32 Not Responding

**Symptoms:**
- No Serial Monitor output
- Board not detected

**Solutions:**

1. **Check USB Connection:**
   - Try different USB cable
   - Try different USB port
   - Check for driver issues

2. **Reset Board:**
   - Press reset button
   - Hold BOOT button while uploading

3. **Check Board Selection:**
   - Verify correct ESP32 board selected
   - Check COM port selection

4. **Reinstall Drivers:**
   - Install CP2102 or CH340 drivers
   - Check Device Manager (Windows)

---

## General Debugging Tips

### Enable Verbose Logging

**Backend:**
```javascript
// In server.js, add more console.log statements
console.log('Request:', req.method, req.path, req.body);
```

**Frontend:**
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

**Microcontroller:**
```cpp
// Add Serial.println() statements throughout code
Serial.println("Debug: Variable value = " + String(variable));
```

### Check Logs

**Backend:**
```bash
pm2 logs perfume-api
# or
tail -f logs/app.log
```

**Frontend:**
- Browser DevTools → Console
- Browser DevTools → Network tab

**Microcontroller:**
- Arduino IDE → Serial Monitor
- Set baud rate to 115200

### Test Individual Components

1. **Test Backend Alone:**
   ```bash
   curl http://localhost:3000/health
   curl -X POST http://localhost:3000/api/create-order \
     -H "Content-Type: application/json" \
     -d '{"amount":10,"sprays":1}'
   ```

2. **Test Frontend Alone:**
   - Open in browser
   - Check browser console
   - Test API calls with Postman

3. **Test Microcontroller Alone:**
   - Check Serial Monitor
   - Test WiFi connection
   - Test pump with simple code

---

## Getting Help

If issues persist:

1. **Check Documentation:**
   - Review SYSTEM_ARCHITECTURE.md
   - Review DEPLOYMENT.md

2. **Check Logs:**
   - Backend server logs
   - Frontend browser console
   - Microcontroller Serial Monitor

3. **Verify Configuration:**
   - All environment variables set
   - All credentials correct
   - All URLs correct

4. **Test Incrementally:**
   - Test each component separately
   - Add components one at a time
   - Verify each step works

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Port 3000 already in use" | Another process using port | Kill process or change port |
| "MongoDB connection failed" | MongoDB not running | Start MongoDB service |
| "WiFi Connection Failed" | Wrong credentials/network | Check SSID and password |
| "API Request Failed" | Server unreachable | Check server IP and firewall |
| "Payment verification failed" | Wrong signature | Check Razorpay keys |
| "Pump not activating" | Wiring/power issue | Check connections and power supply |

---

This troubleshooting guide should help you resolve most common issues. For specific problems, check the relevant component's logs and error messages.

