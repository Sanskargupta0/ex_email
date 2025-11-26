#!/bin/sh
set -e

echo "🔧 Initializing Email Service..."

# Wait a moment for any file system operations
sleep 2

# Check if database exists
if [ ! -f "/app/data/email_service.db" ]; then
    echo "📦 Database not found. Creating new database..."
    
    # Push Prisma schema to create database
    echo "🔨 Pushing Prisma schema..."
    npx prisma db push --accept-data-loss
    
    echo "✅ Database created successfully!"
else
    echo "✅ Database already exists."
    
    # Check if schema needs updating
    echo "🔄 Checking for schema updates..."
    npx prisma db push --accept-data-loss || true
fi

echo "🚀 Starting service: $@"
exec "$@"
