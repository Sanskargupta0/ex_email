# Email Service Microservice

A comprehensive, production-ready email microservice with JWT authentication, queue processing, database logging, and automated cleanup.

## 🚀 Features

- **JWT Authentication** with tool-based access control (`email_service` tool required)
- **Queue-Based Email Processing** using Bull and Redis
- **SQLite Database** with Prisma ORM for complete email tracking
- **RESTful API** with pagination, filtering, and search
- **Retry Mechanism** for failed emails
- **Automated Cleanup** with configurable cycles (daily/weekly/monthly)
- **Admin Controls** for configuration management
- **Email Statistics** and monitoring

## 📋 Prerequisites

- Node.js v18+ 
- Redis server
- Valid SMTP email credentials
- JWT token from authentication service

## ⚡ Quick Start

### Option 1: Docker (Recommended)

**Easiest way to get started - everything included!**

```bash
# 1. Copy and configure environment
copy .env.example .env
# Edit .env with your settings

# 2. Start all services with Docker
start_docker.bat

# That's it! Services running at:
# - API: http://localhost:4000
# - Redis: localhost:6379
```

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for detailed Docker documentation.

### Option 2: Local Development

### 1. Install & Setup

```bash
# Install dependencies
npm install

# Generate Prisma client and create database
npm run setup
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```env
AUTH_SECRET_KEY=your_jwt_secret_key_from_auth_service
SECRET_KEY=your_secret_key_use_for_sending_emails
EMAIL_USER=your_email@domain.com
EMAIL_PASS=your_email_password
```

### 3. Start Services

**Option A: Docker (Recommended)**
```bash
# Start everything with Docker
start_docker.bat

# View logs
docker-compose logs -f

# Stop services
stop_docker.bat
```

**Option B: Windows Batch Files (Local)**
```bash
# Terminal 1 - API Server
start_server.bat

# Terminal 2 - Worker
start_worker.bat
```

**Option B: NPM Scripts**
```bash
# Make sure Redis is running first!
redis-server

# Terminal 1 - API Server
npm run start:server

# Terminal 2 - Worker
npm run start:worker
```

## 📚 Documentation

- **[Docker Guide](DOCKER_GUIDE.md)** - Complete Docker deployment guide
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Quick Start Guide](QUICK_START.md)** - Fast setup and basic usage
- **[Testing Guide](TESTING_GUIDE.md)** - Comprehensive testing scenarios
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Technical details

## 🔑 API Endpoints

### Core Endpoints
- `POST /api/send-email` - Send email (queued)
- `GET /api/emails` - List emails with pagination & filters
- `GET /api/emails/:id` - Get single email
- `POST /api/emails/:id/retry` - Retry failed email
- `DELETE /api/emails/:id` - Delete email
- `GET /api/emails/stats/summary` - Email statistics

### Configuration (Admin Only)
- `GET /api/config` - Get auto-delete config
- `PUT /api/config` - Update auto-delete config
- `POST /api/config/cleanup` - Trigger manual cleanup

### Public
- `GET /api/health` - Health check (no auth)

## 🔒 Authentication

All endpoints (except health check) require a JWT token with `email_service` tool access.

**Example Token Payload:**
```json
{
  "sub": "username",
  "user_id": 123,
  "email": "user@example.com",
  "is_admin": false,
  "is_active": true,
  "approved": true,
  "tools": ["email_service"]
}
```

**Usage:**
```bash
curl http://localhost:4000/api/emails \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Email Status Flow

```
send-email → queued → pending → sent/failed
```

## 🧹 Auto-Cleanup

Configure automatic deletion of old emails:

```bash
curl -X PUT http://localhost:4000/api/config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "autoDeleteEnabled": true,
    "deleteAfterDays": 30,
    "deleteCycle": "daily"
  }'
```

**Cycles:**
- `daily` - Run cleanup once per day
- `weekly` - Run cleanup once per week
- `monthly` - Run cleanup once per month

## 🐳 Docker Deployment

### Quick Docker Start

```bash
# 1. Configure environment
copy .env.example .env
# Edit .env with your credentials

# 2. Start services
start_docker.bat
```

### Docker Services Included

- **Redis** - Queue and cache (port 6379)
- **Email API** - REST API server (port 4000)
- **Email Worker** - Email processor

### Database Storage

**Important**: The database is stored in the `./data` directory on your host machine, NOT inside the container. This means:
- ✅ Data persists even if containers are deleted
- ✅ Easy to backup (just copy the `data` folder)
- ✅ Can access database file directly from your computer
- ✅ Database survives `docker-compose down`

Database file location: `./data/email_service.db`

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop services
stop_docker.bat
# or
docker-compose down

# Restart services
docker-compose restart

# View service status
docker-compose ps
```

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for complete Docker documentation.

## 🛠️ NPM Scripts

```bash
npm run start:server   # Start API server
npm run start:worker   # Start email worker
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:studio      # Open Prisma Studio
npm run setup          # Complete setup (install + db setup)
```

## 📁 Project Structure

```
ex_email/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── auth.js                # JWT authentication
│   ├── database.js            # Database functions
│   ├── scheduler.js           # Auto-cleanup scheduler
│   ├── mailer.js              # Email sending
│   ├── queue.js               # Bull queue setup
│   ├── server.js              # API server
│   ├── worker.js              # Queue worker
│   └── routes/
│       ├── emails.js          # Email endpoints
│       └── config.js          # Config endpoints
├── .env                       # Environment config
├── package.json               # Dependencies
└── *.md                       # Documentation
```

## 🔧 Database Management

**View data:**
```bash
npm run db:studio
# Opens at http://localhost:5555
```

**Reset database:**
```bash
npm run db:reset
```

## 📝 Example Usage

### Send Email
```javascript
const response = await fetch('http://localhost:4000/api/send-email', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome!',
    html: '<h1>Welcome to our service</h1>',
    text: 'Welcome to our service'
  })
});

const data = await response.json();
console.log(data); // { message: "Email queued", jobId: "1", emailId: 1 }
```

### List Emails with Filters
```javascript
const response = await fetch(
  'http://localhost:4000/api/emails?page=1&per_page=20&status=sent&search=example.com',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
console.log(data);
// {
//   data: [...],
//   total: 150,
//   page: 1,
//   per_page: 20,
//   pages: 8
// }
```

## 🐛 Troubleshooting

### Docker Issues

**Services won't start:**
```bash
docker-compose logs
```

**Database not initializing:**
```bash
# Check logs
docker-compose logs email-api | findstr "Database"

# Verify data directory exists
dir data
```

**Reset everything:**
```bash
# Stop services
docker-compose down -v

# Remove database
rmdir /s /q data

# Restart (will recreate database)
start_docker.bat
```

**Redis connection error:**
```bash
docker-compose ps redis
docker-compose restart redis
```

### Local Development Issues

**Redis Connection Error:**
```bash
redis-cli ping  # Should return PONG
```

**Database Issues:**
```bash
npx prisma generate
npx prisma db push
```

**Authentication Errors:**
- Verify `AUTH_SECRET_KEY` matches your auth service
- Verify `SECRET_KEY` matches with your key coming from other services 
- Check token includes `email_service` in tools array
- Ensure token is not expired

## 📦 Dependencies

- `express` - Web framework
- `bull` - Queue processing
- `ioredis` - Redis client
- `nodemailer` - Email sending
- `@prisma/client` - Database ORM
- `jsonwebtoken` - JWT validation
- `node-cron` - Task scheduling
- `dotenv` - Environment variables

## 📄 License

GPL-3.0

## 👨‍💻 Author

Sanskar

## 🤝 Contributing

This is part of the ElectronicX microservices ecosystem.

---

For detailed documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

For testing instructions, see [TESTING_GUIDE.md](TESTING_GUIDE.md)
