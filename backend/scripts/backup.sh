#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — PostgreSQL Backup Script
#
# Creates a timestamped, compressed DB backup, verifies its integrity
# via MD5 checksum, and optionally uploads to S3-compatible storage.
#
# Usage:
#   bash backend/scripts/backup.sh
#   S3_BUCKET=my-bucket bash backend/scripts/backup.sh
#
# Environment variables (can be set in .env or passed directly):
#   DB_HOST      (default: localhost)
#   DB_PORT      (default: 5432)
#   DB_NAME      (default: preskool_db)
#   DB_USER      (default: preskool)
#   PGPASSWORD   (required in production — set in environment)
#   BACKUP_DIR   (default: /var/backups/preskool)
#   RETAIN_DAYS  (default: 30)
#   S3_BUCKET    (optional — enables S3 upload when set)
#   S3_PREFIX    (default: preskool-backups)
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-preskool_db}"
DB_USER="${DB_USER:-preskool}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/preskool}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-preskool-backups}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/preskool-backup-$TIMESTAMP.sql.gz"
CHECKSUM_FILE="$BACKUP_FILE.md5"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}[BACKUP]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

echo "════════════════════════════════════════════════════════"
echo "  PreSkool ERP — Database Backup | $(date)"
echo "════════════════════════════════════════════════════════"

# ── Pre-flight checks ─────────────────────────────────────────────────
command -v pg_dump &>/dev/null || fail "pg_dump not found. Install postgresql-client."
mkdir -p "$BACKUP_DIR"

# ── Step 1: Create compressed backup ─────────────────────────────────
log "Dumping database '$DB_NAME' from $DB_HOST:$DB_PORT..."

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --format=plain \
  --no-owner \
  --no-acl \
  --verbose \
  "$DB_NAME" 2>/tmp/pg_dump_stderr.log \
  | gzip -9 > "$BACKUP_FILE"

if [[ ! -f "$BACKUP_FILE" ]] || [[ ! -s "$BACKUP_FILE" ]]; then
  cat /tmp/pg_dump_stderr.log
  fail "Backup file is empty or missing: $BACKUP_FILE"
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
ok "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# ── Step 2: MD5 checksum ──────────────────────────────────────────────
log "Computing MD5 checksum..."
md5sum "$BACKUP_FILE" > "$CHECKSUM_FILE"
CHECKSUM=$(cut -d' ' -f1 "$CHECKSUM_FILE")
ok "MD5: $CHECKSUM"

# Verify immediately
if md5sum --check "$CHECKSUM_FILE" --quiet 2>/dev/null; then
  ok "Checksum verified ✓"
else
  fail "Checksum verification FAILED — backup may be corrupt"
fi

# ── Step 3: Test decompressibility ────────────────────────────────────
log "Testing gzip integrity..."
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
  ok "Gzip integrity check passed"
else
  fail "Gzip integrity check FAILED — backup is corrupt"
fi

# ── Step 4: S3 upload (optional) ─────────────────────────────────────
if [[ -n "$S3_BUCKET" ]]; then
  log "Uploading to s3://$S3_BUCKET/$S3_PREFIX/..."
  if command -v aws &>/dev/null; then
    aws s3 cp "$BACKUP_FILE"   "s3://$S3_BUCKET/$S3_PREFIX/$(basename "$BACKUP_FILE")"   --storage-class STANDARD_IA
    aws s3 cp "$CHECKSUM_FILE" "s3://$S3_BUCKET/$S3_PREFIX/$(basename "$CHECKSUM_FILE")"
    ok "Uploaded to S3: s3://$S3_BUCKET/$S3_PREFIX/"
  else
    warn "AWS CLI not installed — skipping S3 upload"
  fi
fi

# ── Step 5: Retention policy ──────────────────────────────────────────
log "Cleaning up backups older than $RETAIN_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "preskool-backup-*.sql.gz" -mtime "+$RETAIN_DAYS" -print -delete | wc -l | tr -d ' ')
find "$BACKUP_DIR" -name "preskool-backup-*.sql.gz.md5" -mtime "+$RETAIN_DAYS" -delete 2>/dev/null || true
if [[ "$DELETED" -gt 0 ]]; then
  ok "Deleted $DELETED old backup(s)"
else
  ok "No old backups to purge"
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Backup complete!${NC}"
echo "  File:     $BACKUP_FILE"
echo "  Size:     $BACKUP_SIZE"
echo "  MD5:      $CHECKSUM"
echo "  Checksum: $CHECKSUM_FILE"
echo "════════════════════════════════════════════════════════"
