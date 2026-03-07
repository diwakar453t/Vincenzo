#!/bin/bash
# Azure App Service startup script for PreSkool ERP backend
# This file is executed by Azure App Service on container startup

set -e

echo "🚀 Starting PreSkool ERP backend..."
echo "Python: $(python --version)"
echo "Working directory: $(pwd)"

# Run with gunicorn + uvicorn workers for production performance
exec gunicorn app.main:app \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keep-alive 5 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
