# Deployment Guide - Perfume Dispensing Machine

This guide provides step-by-step instructions for deploying all components of the Perfume Dispensing Machine system.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Server Deployment](#backend-server-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Microcontroller Setup](#microcontroller-setup)
5. [Database Setup](#database-setup)
6. [Razorpay Configuration](#razorpay-configuration)
7. [Domain and HTTPS Setup](#domain-and-https-setup)
8. [Production Checklist](#production-checklist)

---

## Prerequisites

### Required Software
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Git
- Arduino IDE (for microcontroller)
- SSL Certificate (for HTTPS)

### Required Accounts
- Razorpay account (https://razorpay.com)
- Domain name (optional but recommended)
- VPS/Cloud server (AWS, DigitalOcean, etc.)

### Hardware
- ESP32 development board
- Peristaltic or Solenoid pump
- Relay module (if needed)
- Power supplies
- WiFi router

---

## Backend Server Deployment

### Option 1: Local Development Server

1. **Clone/Navigate to project directory:**
   ```bash
   cd "C:\Users\Pruthh\OneDrive\Desktop\Perfume APP\backend"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   JWT_SECRET=your_random_secret_key
   MONGODB_URI=mongodb://localhost:27017/perfume_dispensing
   ```

4. **Start MongoDB:**
   ```bash
   # Windows
   mongod
   
   # Linux/Mac
   sudo systemctl start mongod
   ```

5. **Start server:**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

6. **Verify server is running:**
   - Open browser: `http://localhost:3000/health`
   - Should see: `{"success":true,"message":"Server is running"}`

### Option 2: Production Server (VPS/Cloud)

#### Using PM2 (Process Manager)

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js and MongoDB:**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo apt-get install -y mongodb
   
   # Or use nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   ```

3. **Clone/Upload project files:**
   ```bash
   # Option A: Git clone
   git clone <your-repo-url>
   cd perfume-dispensing-backend
   
   # Option B: Upload via SCP
   scp -r backend/ user@server:/opt/perfume-dispensing/
   ```

4. **Install dependencies:**
   ```bash
   cd /opt/perfume-dispensing/backend
   npm install --production
   ```

5. **Create `.env` file:**
   ```bash
   nano .env
   ```
   ```env
   PORT=3000
   NODE_ENV=production
   RAZORPAY_KEY_ID=your_production_key_id
   RAZORPAY_KEY_SECRET=your_production_key_secret
   JWT_SECRET=your_very_secure_random_secret
   MONGODB_URI=mongodb://localhost:27017/perfume_dispensing
   ```

6. **Install PM2:**
   ```bash
   sudo npm install -g pm2
   ```

7. **Start with PM2:**
   ```bash
   pm2 start server.js --name perfume-api
   pm2 save
   pm2 startup
   ```

8. **Configure PM2 to restart on reboot:**
   ```bash
   pm2 startup systemd
   # Follow the instructions shown
   ```

9. **Monitor:**
   ```bash
   pm2 status
   pm2 logs perfume-api
   ```

#### Using Nginx as Reverse Proxy

1. **Install Nginx:**
   ```bash
   sudo apt-get update
   sudo apt-get install nginx
   ```

2. **Create Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/perfume-api
   ```
   
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/perfume-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Frontend Deployment

### Option 1: Development Server

1. **Navigate to frontend directory:**
   ```bash
   cd "C:\Users\Pruthh\OneDrive\Desktop\Perfume APP\frontend"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```env
   REACT_APP_API_URL=http://localhost:3000/api
   ```

4. **Start development server:**
   ```bash
   npm start
   ```
   - Opens at `http://localhost:3000`

### Option 2: Production Build

1. **Build for production:**
   ```bash
   npm run build
   ```
   - Creates `build/` directory with optimized files

2. **Option A: Serve with Nginx**
   
   ```bash
   # Copy build files
   sudo cp -r build/* /var/www/html/
   
   # Or create separate directory
   sudo mkdir -p /var/www/perfume-frontend
   sudo cp -r build/* /var/www/perfume-frontend/
   ```
   
   **Nginx configuration:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/perfume-frontend;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Option B: Deploy to Netlify/Vercel**
   
   - Connect your Git repository
   - Set build command: `npm run build`
   - Set publish directory: `build`
   - Add environment variable: `REACT_APP_API_URL=https://your-api-domain.com/api`

---

## Microcontroller Setup

### 1. Install Arduino IDE

1. Download from: https://www.arduino.cc/en/software
2. Install ESP32 board support:
   - File → Preferences → Additional Board Manager URLs
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install

### 2. Install Required Libraries

- Tools → Manage Libraries
- Install:
  - **ArduinoJson** (by Benoit Blanchon) - v6.x
  - HTTPClient (usually included with ESP32)

### 3. Configure Firmware

1. Open `microcontroller/perfume_dispenser.ino`
2. Update configuration:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* apiBaseUrl = "http://your-server-ip:3000/api";
   // For production with HTTPS:
   // const char* apiBaseUrl = "https://your-domain.com/api";
   const int PUMP_PIN = 2;  // Adjust based on your wiring
   ```

### 4. Upload to ESP32

1. Connect ESP32 via USB
2. Select Board: Tools → Board → ESP32 Dev Module
3. Select Port: Tools → Port → (your ESP32 port)
4. Click Upload
5. Open Serial Monitor (115200 baud) to see output

### 5. Test Connection

- Check Serial Monitor for:
  - "WiFi Connected"
  - "API Response Code: 200"
  - "No pending orders" (if no orders exist)

---

## Database Setup

### MongoDB Installation

**Ubuntu/Debian:**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Windows:**
- Download from: https://www.mongodb.com/try/download/community
- Run installer
- MongoDB starts as a Windows service

### Create Database and Collections

MongoDB will create collections automatically when first document is inserted. No manual setup needed.

### Backup Strategy

```bash
# Create backup
mongodump --db perfume_dispensing --out /backup/$(date +%Y%m%d)

# Restore backup
mongorestore --db perfume_dispensing /backup/20240101/perfume_dispensing
```

---

## Razorpay Configuration

### 1. Create Razorpay Account

1. Sign up at: https://razorpay.com
2. Complete KYC verification
3. Activate test/live mode

### 2. Get API Keys

1. Dashboard → Settings → API Keys
2. Generate Key ID and Key Secret
3. Copy to `.env` file:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
   ```

### 3. Configure Webhooks (Optional)

1. Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhook`
3. Select events: `payment.captured`, `payment.failed`

### 4. Test Mode vs Live Mode

- **Test Mode:** Use test keys (starts with `rzp_test_`)
- **Live Mode:** Use live keys (starts with `rzp_live_`)
- Switch in Razorpay dashboard

---

## Domain and HTTPS Setup

### 1. Purchase Domain

- Use any registrar (GoDaddy, Namecheap, etc.)
- Point DNS to your server IP

### 2. Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 3. Update Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Frontend
    location / {
        root /var/www/perfume-frontend;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Update ESP32 Firmware

Change `apiBaseUrl` to HTTPS:
```cpp
const char* apiBaseUrl = "https://your-domain.com/api";
```

**Note:** ESP32 requires SSL certificate validation. You may need to add certificate to firmware or disable validation for testing (not recommended for production).

---

## Production Checklist

### Backend
- [ ] Environment variables configured
- [ ] MongoDB authentication enabled
- [ ] PM2 process manager running
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall rules configured
- [ ] Logging configured
- [ ] Backup strategy implemented

### Frontend
- [ ] Production build created
- [ ] Environment variables set
- [ ] API URL points to production
- [ ] Deployed to hosting/CDN
- [ ] HTTPS enabled

### Microcontroller
- [ ] WiFi credentials configured
- [ ] API URL points to production (HTTPS)
- [ ] Pump wiring verified
- [ ] Test dispense successful
- [ ] Serial monitor shows successful API calls

### Razorpay
- [ ] Live API keys configured
- [ ] Webhooks configured (optional)
- [ ] Test payment successful
- [ ] Payment verification working

### Security
- [ ] Strong JWT secret
- [ ] MongoDB password set
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] SSH key authentication (disable password)
- [ ] Regular security updates

### Monitoring
- [ ] Server uptime monitoring
- [ ] Error logging configured
- [ ] Database backup automated
- [ ] Alerts configured (optional)

---

## Testing Deployment

### 1. Test Backend API
```bash
curl http://your-domain.com/health
# Should return: {"success":true,"message":"Server is running"}
```

### 2. Test Frontend
- Visit: `https://your-domain.com`
- Should load admin dashboard

### 3. Test Payment Flow
1. Visit: `https://your-domain.com/payment`
2. Create order
3. Complete test payment
4. Verify order appears in admin dashboard

### 4. Test Microcontroller
- Check Serial Monitor for successful API calls
- Create test order
- Verify pump activates
- Check admin dashboard for status update

---

## Troubleshooting

See `TROUBLESHOOTING.md` for detailed troubleshooting guide.

---

## Maintenance

### Regular Tasks
- Monitor server logs: `pm2 logs`
- Check MongoDB disk space
- Review failed transactions
- Update dependencies: `npm update`
- Backup database weekly

### Updates
1. Pull latest code
2. Install dependencies: `npm install`
3. Restart PM2: `pm2 restart perfume-api`
4. Test functionality

---

Your system should now be fully deployed and operational!

