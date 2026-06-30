# ClientFlow — Agency Management SaaS

A production-ready SaaS application for digital marketing agencies to manage client proposals and invoices with automated email and WhatsApp reminders.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | JWT (JSON Web Tokens) |
| PDF | PDFKit |
| Email | Nodemailer (SMTP) |
| WhatsApp | Generic REST API adapter |
| Scheduler | node-cron |
| Charts | Recharts |
| State | TanStack Query |

---

## 📁 Folder Structure

```
clientflow/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, error, rate-limit
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # Express routers
│   │   ├── services/          # PDF, Email, WhatsApp, Scheduler
│   │   ├── utils/             # DB, logger, number generator
│   │   └── index.ts           # Server entry point
│   ├── uploads/               # Uploaded logos (auto-created)
│   ├── logs/                  # Winston logs (auto-created)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── api/               # Axios API client
    │   ├── components/
    │   │   └── layout/        # Sidebar, Header, Layout
    │   ├── context/           # Auth, Theme (dark mode)
    │   ├── pages/             # All route pages
    │   ├── types/             # TypeScript interfaces
    │   ├── utils/             # Formatters, helpers
    │   ├── App.tsx            # Router setup
    │   └── main.tsx           # Entry point
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── package.json
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourname/clientflow.git
cd clientflow
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env

# Create required directories
mkdir -p uploads/logos logs

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health

### 5. Create First Account

Go to http://localhost:5173/register and create your account. Then go to **Settings** to configure:
1. Company details + logo
2. Email SMTP settings
3. WhatsApp API settings

---

## 🔐 Environment Variables

Create `backend/.env` from `.env.example`:

```env
# Server
NODE_ENV=production
PORT=5000

# MongoDB — use Atlas URI for production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/clientflow

# JWT — use a long random string in production
JWT_SECRET=replace_with_64_char_random_string
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=https://yourdomain.com

# File uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🚀 Production Deployment (VPS — Ubuntu)

### Server Requirements
- Ubuntu 20.04+ VPS (minimum 1GB RAM)
- Node.js 18+
- MongoDB (or MongoDB Atlas)
- Nginx
- PM2
- SSL certificate (Let's Encrypt)

---

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Upload & Build

```bash
# On your local machine, build frontend
cd clientflow/frontend
npm run build

# Upload files to server (replace with your server IP)
scp -r clientflow/ user@YOUR_SERVER_IP:/var/www/clientflow

# Or use git on the server:
# cd /var/www && git clone https://github.com/yourname/clientflow.git
```

### Step 3: Install & Build on Server

```bash
ssh user@YOUR_SERVER_IP

# Backend
cd /var/www/clientflow/backend
npm install --production
cp .env.example .env
nano .env  # Fill in production values
npm run build

# Create uploads & logs directories
mkdir -p uploads/logos logs
chmod 755 uploads
```

### Step 4: Configure PM2

```bash
# Create PM2 ecosystem file
cat > /var/www/clientflow/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'clientflow-api',
    script: '/var/www/clientflow/backend/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    error_file: '/var/www/clientflow/backend/logs/pm2-error.log',
    out_file: '/var/www/clientflow/backend/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 1000,
    max_restarts: 10,
  }]
}
EOF

# Start the app
cd /var/www/clientflow
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the printed command
```

### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/clientflow
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React build)
    root /var/www/clientflow/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        client_max_body_size 10M;
    }

    # Uploads proxy
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }

    # React Router — send all other requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/clientflow /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl reload nginx
```

### Step 6: SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts, choose to redirect HTTP to HTTPS
sudo systemctl reload nginx
```

### Step 7: Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 📧 Email Configuration (Gmail Example)

1. Enable 2-Factor Authentication in your Google account
2. Go to: Google Account → Security → App Passwords
3. Generate an App Password for "Mail"
4. In ClientFlow Settings → Email:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - Email: `you@gmail.com`
   - Password: *(your 16-character App Password)*
   - From Name: `Your Agency Name`

---

## 📱 WhatsApp API Configuration

ClientFlow works with any WhatsApp Business API provider. The request format is:

```json
POST <your_api_url>
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
  "phone": "+91 9999999999",
  "message": "Hello John, ..."
}
```

**Recommended providers:**
- **Wati.io** — Indian-friendly, affordable
- **2Chat.io** — Simple setup
- **UltraMsg** — Budget-friendly
- **Twilio** — Enterprise-grade

---

## 🔄 Automated Reminders

The scheduler runs automatically on server start:
- **Daily at midnight**: Marks overdue invoices (past due date)
- **Daily at 9 AM**: Sends email + WhatsApp reminders for all pending invoices that haven't received a reminder in the past 7 days

Reminder message template:
```
Hello {ClientName},

This is a friendly reminder regarding Invoice #{InvoiceNumber} for ₹{Amount}.

Kindly make the payment at your earliest convenience.

Thank you.
{CompanyName}
```

---

## 📊 Database Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Agency user accounts |
| `clients` | Client contact information |
| `invoices` | Invoice records with line items |
| `proposals` | Proposal records with services |
| `settings` | Per-user SMTP, WhatsApp, company config |
| `reminderlogs` | Audit log of all reminders sent |

---

## 🛠 PM2 Management Commands

```bash
pm2 status                    # Check app status
pm2 logs clientflow-api       # View live logs
pm2 restart clientflow-api    # Restart app
pm2 reload clientflow-api     # Zero-downtime reload
pm2 stop clientflow-api       # Stop app
pm2 monit                     # Real-time monitoring dashboard
```

---

## 🔒 Security Features

- JWT authentication with expiry
- Password hashing (bcrypt, 12 rounds)
- Rate limiting (200 req/15min general, 10 req/15min auth)
- Helmet.js security headers
- CORS configured for specific origin
- Input validation
- MongoDB injection prevention via Mongoose

---

## 📦 Build Commands

```bash
# Backend
cd backend && npm run build    # Compile TypeScript → dist/

# Frontend
cd frontend && npm run build   # Build React → dist/
```

---

## 🔧 Updating Production

```bash
# On server
cd /var/www/clientflow
git pull origin main

# Rebuild backend
cd backend && npm install && npm run build

# Rebuild frontend
cd ../frontend && npm install && npm run build

# Restart API
pm2 reload clientflow-api

# Reload nginx (if nginx config changed)
sudo systemctl reload nginx
```

---

## 📝 Feature Summary

### ✅ Invoice Module
- Auto-generated invoice numbers (INV-YYYYMM-XXXX)
- Multi-line service items with tax
- PDF generation with professional design
- Status: Pending / Paid / Overdue
- Send via Email & WhatsApp
- Automated 7-day payment reminders
- Mark as Paid / Pending

### ✅ Proposal Module
- Auto-generated proposal numbers (PROP-YYYYMM-XXXX)
- Service list with descriptions and pricing
- Status: Draft / Sent / Accepted / Rejected
- PDF generation with branding
- Duplicate proposal in one click
- Send via Email & WhatsApp

### ✅ Client Management
- Full client profiles
- Auto-saved from invoice/proposal creation
- Revenue history per client
- Search across all clients

### ✅ Dashboard
- Revenue overview with 6-month chart
- Invoice & proposal statistics
- Recent activity feed

### ✅ Settings
- Company branding (logo, name, address, GST)
- SMTP email configuration
- WhatsApp API configuration
- Dark/Light mode

---

## 🆘 Troubleshooting

**MongoDB won't connect:**
```bash
sudo systemctl status mongod
sudo systemctl start mongod
```

**PDF download fails:**
- Check that `pdfkit` is installed: `npm list pdfkit`
- Ensure the server has write permissions to `/tmp`

**Email not sending:**
- Verify SMTP credentials in Settings
- For Gmail, use App Password (not regular password)
- Check server port 587 is not blocked by VPS firewall

**WhatsApp not sending:**
- Verify API URL format matches your provider's docs
- Check API key is valid and not expired
- Ensure phone numbers include country code (+91...)

---

*Built with ❤️ for digital marketing agencies*
