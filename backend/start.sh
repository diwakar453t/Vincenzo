#!/bin/sh
# start.sh — PreSkool ERP backend startup script
# 
# FORWARDED_ALLOW_IPS is set as an environment variable so uvicorn reads it
# directly without any shell expansion of '*'. This completely avoids the
# glob expansion issue that occurred with --forwarded-allow-ips '*' in CMD.
#
export FORWARDED_ALLOW_IPS="${FORWARDED_ALLOW_IPS:-*}"
PORT="${PORT:-8000}"

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 2 \
    --proxy-headers \
    --access-log
