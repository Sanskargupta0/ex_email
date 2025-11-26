# Email Service API

A comprehensive email microservice with queue processing, authentication, database logging, and automated cleanup features.

## Features

- 🔐 **JWT Authentication** - Token-based auth with tool-based access control
- 📧 **Async Email Queue** - Redis-backed Bull queue for reliable email delivery
- 💾 **Database Logging** - SQLite database with Prisma ORM for email tracking
- 🔄 **Retry Failed Emails** - Manually retry failed email deliveries
- 🔍 **Advanced Filtering** - Search, filter by status, and paginate email logs
- 🧹 **Auto-Cleanup** - Configurable automatic deletion of old emails
- 📊 **Email Statistics** - Get summary stats of email statuses

## Prerequisites

- Node.js (v18 or higher)
- Redis server running
- Valid SMTP email credentials

## Installation

### Option 1: Docker (Recommended)

The easiest way to get started with all dependencies included.

```bash
# 1. Copy environment file
copy .env.example .env

# 2. Edit .env with your credentials
# AUTH_SECRET_KEY, SECRET_KEY, EMAIL_HOST, EMAIL_USER, EMAIL_PASS

# 3. Start all services
start_docker.bat

# 4. Verify services are running
curl http://localhost:4000/api/health
```

Services will be available at:
- **API Server**: http://localhost:4000
- **Redis**: localhost:6379

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for detailed Docker documentation.

### Option 2: Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=4000
REDIS_URL=redis://127.0.0.1:6379
DATABASE_URL=file:./email_service.db
AUTH_SECRET_KEY=your_jwt_secret_key_matching_auth_service
SECRET_KEY=your_secret_key_use_for_sending_emails

EMAIL_HOST=mail.privateemail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=info@electronicx.app
EMAIL_PASS=your_email_password
```

**Important:** The `AUTH_SECRET_KEY` must match the secret key used by your authentication service to sign JWT tokens.

### 3. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Or create database without migrations
npx prisma db push
```

### 4. Start Redis Server

Make sure Redis is running:

```bash
redis-server
```

### 5. Start Services

**Docker:**
```bash
start_docker.bat
```

**Local (Manual):**

You need to run both the API server and the worker:

**Terminal 1 - API Server:**
```bash
node src/server.js
```

**Terminal 2 - Email Worker:**
```bash
node src/worker.js
```

## API Endpoints

### Authentication

All endpoints except `/api/health` require a valid JWT token with `email_service` tool access.

**Authorization Header:**
```
Authorization: Bearer <your_jwt_token>
```

### 1. Health Check

**GET** `/api/health`

No authentication required.

```json
{
  "status": "ok",
  "service": "email-service"
}
```

---

### 2. Send Email

**POST** `/api/send-email`

Send an email (adds to queue).

**Request:**
```json
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "html": "<h1>Welcome to our service</h1>",
  "text": "Welcome to our service"
}
```

**Response (202):**
```json
{
  "message": "Email queued",
  "jobId": "123",
  "emailId": 45
}
```

---

### 3. List Emails

**GET** `/api/emails`

Get paginated list of emails with filtering.

**Query Parameters:**
- `page` (default: 1) - Page number
- `per_page` (default: 10) - Items per page
- `status` (optional) - Filter by status: `pending`, `queued`, `sent`, `failed`
- `search` (optional) - Search in recipient email or subject
- `sort_by` (default: createdAt) - Sort field
- `sort_order` (default: desc) - Sort order: `asc` or `desc`

**Example:**
```
GET /api/emails?page=1&per_page=20&status=failed&search=example.com
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 45,
      "to": "user@example.com",
      "subject": "Welcome!",
      "html": "<h1>Welcome</h1>",
      "text": "Welcome",
      "status": "sent",
      "jobId": "123",
      "attempts": 1,
      "error": null,
      "sentAt": "2025-11-26T10:30:00.000Z",
      "createdAt": "2025-11-26T10:29:45.000Z",
      "updatedAt": "2025-11-26T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "pages": 8
}
```

---

### 4. Retry Failed Email

**POST** `/api/emails/:id/retry`

Retry sending a failed email.

**Response (200):**
```json
{
  "message": "Email queued for retry",
  "jobId": "456",
  "emailId": 45
}
```

---

### 5. Delete Email

**DELETE** `/api/emails/:id`

Delete an email log entry.

**Response (200):**
```json
{
  "message": "Email deleted successfully",
  "id": 45
}
```

---

### 6. Email Statistics

**GET** `/api/emails/stats/summary`

Get summary statistics of all emails.

**Response (200):**
```json
{
  "total": 1500,
  "sent": 1420,
  "failed": 50,
  "pending": 5,
  "queued": 25
}
```

---

### 7. Get Auto-Delete Configuration

**GET** `/api/config`

Get current auto-delete configuration.

**Response (200):**
```json
{
  "id": 1,
  "autoDeleteEnabled": true,
  "deleteAfterDays": 30,
  "deleteCycle": "daily",
  "lastCleanupAt": "2025-11-26T00:00:00.000Z",
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-11-26T00:00:00.000Z"
}
```

---

### 8. Update Auto-Delete Configuration

**PUT** `/api/config`

Update auto-delete configuration. **Requires admin privileges.**

**Request:**
```json
{
  "autoDeleteEnabled": true,
  "deleteAfterDays": 90,
  "deleteCycle": "weekly"
}
```

Valid `deleteCycle` values:
- `daily` - Delete old emails once per day
- `weekly` - Delete old emails once per week
- `monthly` - Delete old emails once per month

**Response (200):**
```json
{
  "message": "Configuration updated successfully",
  "config": {
    "id": 1,
    "autoDeleteEnabled": true,
    "deleteAfterDays": 90,
    "deleteCycle": "weekly",
    "lastCleanupAt": "2025-11-26T00:00:00.000Z",
    "createdAt": "2025-11-25T10:00:00.000Z",
    "updatedAt": "2025-11-26T12:00:00.000Z"
  }
}
```

---

### 9. Manual Cleanup

**POST** `/api/config/cleanup`

Manually trigger email cleanup. **Requires admin privileges.**

**Response (200):**
```json
{
  "message": "Cleanup completed successfully",
  "deletedCount": 150,
  "deleteAfterDays": 30
}
```

---

## Email Statuses

- **`queued`** - Email has been added to the queue
- **`pending`** - Email is currently being processed
- **`sent`** - Email was sent successfully
- **`failed`** - Email delivery failed

## Auto-Cleanup Feature

The service includes an automatic cleanup scheduler that runs hourly and checks if cleanup should be performed based on the configured cycle:

- **Daily**: Deletes emails older than `deleteAfterDays` once per day
- **Weekly**: Deletes emails older than `deleteAfterDays` once per week
- **Monthly**: Deletes emails older than `deleteAfterDays` once per month

The scheduler respects the `lastCleanupAt` timestamp to avoid running cleanup too frequently.

## Access Control

### Required Tool Access

Users must have the `email_service` tool in their JWT token to access any email endpoints.

**JWT Token Payload Example:**
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

### Admin-Only Endpoints

- `PUT /api/config` - Update auto-delete configuration
- `POST /api/config/cleanup` - Trigger manual cleanup

These require both `email_service` tool access AND `is_admin: true` in the JWT token.

## Database Schema

### EmailLog Table

```prisma
model EmailLog {
  id          Int       @id @default(autoincrement())
  to          String
  subject     String
  html        String?
  text        String?
  status      String    @default("pending")
  jobId       String?   @unique
  attempts    Int       @default(0)
  error       String?
  sentAt      DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### EmailConfig Table

```prisma
model EmailConfig {
  id                Int      @id @default(autoincrement())
  autoDeleteEnabled Boolean  @default(false)
  deleteAfterDays   Int      @default(30)
  deleteCycle       String   @default("daily")
  lastCleanupAt     DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized: No token provided"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden: You need 'email_service' tool access. Please contact an administrator."
}
```

### 404 Not Found
```json
{
  "message": "Email not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "error": "Error details"
}
```

## Development

### View Database

```bash
# Open Prisma Studio
npx prisma studio
```

### Reset Database

```bash
# Delete database and recreate
npx prisma migrate reset
```

### Update Schema

After modifying `prisma/schema.prisma`:

```bash
npx prisma generate
npx prisma db push
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ JWT Token
       ▼
┌─────────────┐
│  API Server │ ──► Authentication Middleware
│ (server.js) │ ──► Route Handlers
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ Bull Queue  │ ──► │ Redis Server │
│ (queue.js)  │     └──────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   Worker    │ ──► │   Mailer     │
│ (worker.js) │     │ (mailer.js)  │
└──────┬──────┘     └──────────────┘
       │
       ▼
┌─────────────┐
│   SQLite    │
│  Database   │
└─────────────┘
```

## Troubleshooting

### Docker Issues

**View logs:**
```bash
docker-compose logs -f
```

**Restart services:**
```bash
docker-compose restart
```

**Reset everything:**
```bash
docker-compose down -v
docker-compose up -d
```

### Local Development Issues

### Redis Connection Error

Ensure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Database Errors

Regenerate Prisma client:
```bash
npx prisma generate
```

### Authentication Errors

Verify that `AUTH_SECRET_KEY` matches your auth service's JWT signing key.

## License

GPL-3.0
