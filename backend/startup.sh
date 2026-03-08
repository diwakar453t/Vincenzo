#!/bin/bash
# Azure App Service startup script for PreSkool ERP backend
# This file is executed by Azure App Service on container startup

set -e

echo "🚀 Starting PreSkool ERP backend..."
echo "Python: $(python --version)"
echo "Working directory: $(pwd)"

# Step 1: Run database migrations to ensure schema is current
echo "📦 Running database migrations..."
alembic upgrade head && echo "✅ Migrations complete" || echo "⚠️  Migration step failed — continuing"

# Step 2: Seed demo accounts (idempotent — safe to run on every startup)
echo "🌱 Seeding demo accounts..."
python seeds/seed_data.py && echo "✅ Seeding complete" || echo "⚠️  Seed step failed — continuing"

# Step 3: Start the application
echo "🌐 Starting gunicorn..."
exec gunicorn app.main:app \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keep-alive 5 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
