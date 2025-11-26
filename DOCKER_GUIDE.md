# Docker Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker installed
- Docker Compose installed

### 1. Setup Environment

Copy `.env.example` to `.env` and update with your values:

```bash
copy .env.example .env
```

Edit `.env`:
```env
AUTH_SECRET_KEY=your_jwt_secret_key
SECRET_KEY=your_secret_key_use_for_sending_emails
EMAIL_HOST=mail.privateemail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=info@electronicx.app
EMAIL_PASS=your_email_password
```

### 2. Start Services

**Windows:**
```bash
start_docker.bat
```

**Linux/Mac:**
```bash
docker-compose up -d
```

### 3. Verify Services

Check health:
```bash
curl http://localhost:4000/api/health
```

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f email-api
docker-compose logs -f email-worker
docker-compose logs -f redis
```

## Docker Services

The docker-compose setup includes:

1. **Redis** - Queue and cache service
   - Port: 6379
   - Persistent storage with Docker volume
   - Health checks enabled

2. **Email API** - REST API server
   - Port: 4000
   - Database stored in `./data` directory on host
   - Auto-restarts on failure
   - Health checks enabled
   - Initializes database on first run

3. **Email Worker** - Queue processor
   - Processes email jobs
   - Shares database with API via host mount
   - Auto-restarts on failure
   - Waits for API health check before starting

## Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
# Windows
stop_docker.bat

# Linux/Mac
docker-compose down
```

### View Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f email-api
docker-compose logs -f email-worker
docker-compose logs -f redis
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild Images
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Remove Everything (including volumes)
```bash
docker-compose down -v
```

### Check Service Status
```bash
docker-compose ps
```

### Execute Commands in Container
```bash
# Access API container shell
docker-compose exec email-api sh

# View database with Prisma Studio (in container)
docker-compose exec email-api npx prisma studio
```

## Volumes

The setup uses persistent storage:

### Docker Volume
- `redis-data` - Redis data persistence (inside Docker)

### Host Mount
- `./data` - SQLite database storage (on your computer)
  - **Database file**: `./data/email_service.db`
  - **Advantage**: Data persists even if containers are removed
  - **Backup**: Simply copy the `./data` directory

### Database Initialization

The API container automatically:
1. Checks if database exists
2. If not, creates it using `prisma db push`
3. If exists, checks for schema updates
4. Starts the API server

This happens via the `docker-entrypoint.sh` script.

To backup volumes:
```bash
# Backup Redis data (from Docker volume)
docker run --rm -v email_redis-data:/data -v ${PWD}:/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Backup database (from host directory)
# Windows
xcopy data data-backup /E /I

# Linux/Mac
cp -r data data-backup
```

To restore database:
```bash
# Windows
xcopy data-backup data /E /I /Y

# Linux/Mac
cp -r data-backup/* data/
```

## Environment Variables

Docker containers use these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | API server port | 4000 |
| REDIS_URL | Redis connection URL | redis://redis:6379 |
| DATABASE_URL | SQLite database path | file:/app/data/email_service.db |
| AUTH_SECRET_KEY | JWT secret key | (required) |
| SECRET_KEY | String |(required) |
| EMAIL_HOST | SMTP server host | (required) |
| EMAIL_PORT | SMTP server port | 465 |
| EMAIL_SECURE | Use SSL/TLS | true |
| EMAIL_USER | SMTP username | (required) |
| EMAIL_PASS | SMTP password | (required) |

## Networking

All services run on the `email-network` bridge network:

- Services can communicate using service names
- API accessible on host: `localhost:4000`
- Redis accessible on host: `localhost:6379`

## Health Checks

### Redis
```bash
docker-compose exec redis redis-cli ping
```

### API Server
```bash
curl http://localhost:4000/api/health
```

### Check All Services
```bash
docker-compose ps
```

## Troubleshooting

### Services Won't Start

Check logs:
```bash
docker-compose logs
```

### Redis Connection Issues

Verify Redis is running:
```bash
docker-compose ps redis
docker-compose logs redis
```

### API Server Issues

Check API logs:
```bash
docker-compose logs email-api
```

Restart API:
```bash
docker-compose restart email-api
```

### Worker Not Processing Emails

Check worker logs:
```bash
docker-compose logs email-worker
```

Restart worker:
```bash
docker-compose restart email-worker
```

### Database Issues

Check database on host:
```bash
# Windows
dir data

# Linux/Mac
ls -la data/
```

Check database in container:
```bash
docker-compose exec email-api ls -la /app/data/
```

View database initialization logs:
```bash
docker-compose logs email-api | findstr "Database"
```

Reset database:
```bash
# Stop services
docker-compose down

# Delete database file
# Windows
del data\email_service.db
rmdir /s /q data

# Linux/Mac
rm -rf data/*

# Restart services (will recreate database)
docker-compose up -d
```

## Production Deployment

### 1. Security

Update `.env` with strong secrets:
```env
AUTH_SECRET_KEY=use-a-strong-random-secret-key-here
SECRET_KEY=your_secret_key_use_for_sending_emails
EMAIL_PASS=use-your-actual-password
```

### 2. Resource Limits

Add to `docker-compose.yml`:
```yaml
services:
  email-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### 3. Logging

Configure logging driver:
```yaml
services:
  email-api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. Reverse Proxy

Use nginx or traefik for SSL and load balancing.

### 5. Monitoring

Add health check endpoints to monitoring tools like:
- Prometheus
- Grafana
- Uptime Kuma

## Development with Docker

Mount source code for live reload:
```yaml
services:
  email-api:
    volumes:
      - ./src:/app/src
      - email-db:/app/data
    command: npm run dev
```

## CI/CD Integration

### Build Image
```bash
docker build -t email-service:latest .
```

### Tag and Push
```bash
docker tag email-service:latest your-registry/email-service:latest
docker push your-registry/email-service:latest
```

### Pull and Run
```bash
docker pull your-registry/email-service:latest
docker-compose up -d
```

## Scaling

Run multiple workers:
```bash
docker-compose up -d --scale email-worker=3
```

Note: API server should only run as single instance unless using load balancer.
