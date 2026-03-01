#!/bin/sh
# start.sh — PreSkool ERP backend startup script
# 
# CRITICAL: set -f disables shell glob expansion (noglob).
# Without this, the '*' in --forwarded-allow-ips '*' gets
# expanded to all filenames in /app, crashing uvicorn.
#
set -f

PORT="${PORT:-8000}"

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 2 \
    --proxy-headers \
    --forwarded-allow-ips '*' \
    --access-log
