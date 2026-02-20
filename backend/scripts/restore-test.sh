#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Restore & Smoke Test Script
#
# Restores the latest backup to a temporary test database,
# runs a smoke query to verify all key tables are present,
# then drops the test DB.
#
# Usage:
#   bash backend/scripts/restore-test.sh
#   bash backend/scripts/restore-test.sh /path/to/specific/backup.sql.gz
#
# Environment:
#   DB_HOST, DB_PORT, DB_USER, PGPASSWORD (same as backup.sh)
#   BACKUP_DIR  (default: /var/backups/preskool)
#   TEST_DB     (default: preskool_restore_test)
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-preskool}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/preskool}"
TEST_DB="${TEST_DB:-preskool_restore_test}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}[RESTORE]${NC} $*"; }
ok()   { echo -e "${GREEN}[PASS]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}    $*"; }
fail() { echo -e "${RED}[FAIL]${NC}    $*"; cleanup; exit 1; }

PASS=0; FAIL=0

cleanup() {
  log "Dropping test database '$TEST_DB'..."
  psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
    -c "DROP DATABASE IF EXISTS $TEST_DB;" postgres 2>/dev/null || true
  ok "Test database dropped"
}
trap cleanup EXIT

echo "════════════════════════════════════════════════════════"
echo "  PreSkool ERP — Restore & Smoke Test | $(date)"
echo "════════════════════════════════════════════════════════"

# ── 1. Find latest backup ─────────────────────────────────────────────
if [[ $# -ge 1 ]]; then
  BACKUP_FILE="$1"
else
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/preskool-backup-*.sql.gz 2>/dev/null | head -1 || true)
fi

if [[ -z "$BACKUP_FILE" ]] || [[ ! -f "$BACKUP_FILE" ]]; then
  fail "No backup file found in $BACKUP_DIR. Run backup.sh first."
fi
log "Using backup: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# ── 2. Verify checksum ────────────────────────────────────────────────
CHECKSUM_FILE="$BACKUP_FILE.md5"
if [[ -f "$CHECKSUM_FILE" ]]; then
  log "Verifying MD5 checksum..."
  if md5sum --check "$CHECKSUM_FILE" --quiet 2>/dev/null; then
    ok "Checksum verified"
    ((PASS++))
  else
    fail "Checksum MISMATCH — backup may be corrupt. Aborting restore."
  fi
else
  warn "No checksum file found — skipping integrity check"
fi

# ── 3. Create test database ───────────────────────────────────────────
log "Creating test database '$TEST_DB'..."
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  -c "DROP DATABASE IF EXISTS $TEST_DB;" postgres 2>/dev/null
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  -c "CREATE DATABASE $TEST_DB;" postgres
ok "Test database created"

# ── 4. Restore backup ─────────────────────────────────────────────────
log "Restoring backup..."
gunzip -c "$BACKUP_FILE" \
  | psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
         --dbname="$TEST_DB" \
         -v ON_ERROR_STOP=0 \
         -q 2>/tmp/restore-stderr.log

if [[ -s /tmp/restore-stderr.log ]]; then
  ERRORS=$(grep -c "ERROR:" /tmp/restore-stderr.log 2>/dev/null || echo "0")
  if [[ "$ERRORS" -gt 0 ]]; then
    warn "Restore completed with $ERRORS error(s) — check /tmp/restore-stderr.log"
    ((FAIL++))
  fi
fi
ok "Restore complete"
((PASS++))

# ── 5. Smoke tests ────────────────────────────────────────────────────
log "Running smoke tests..."

psql_query() {
  psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
       --dbname="$TEST_DB" --tuples-only --no-align -c "$1" 2>/dev/null | tr -d ' '
}

check_table() {
  local table="$1"
  local count
  count=$(psql_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';" || echo "0")
  if [[ "$count" -ge 1 ]]; then
    ok "Table exists: $table"
    ((PASS++))
  else
    fail "Table MISSING: $table"
    ((FAIL++))
  fi
}

check_row_count() {
  local table="$1"
  local min_rows="${2:-0}"
  local count
  count=$(psql_query "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null || echo "unknown")
  if [[ "$count" =~ ^[0-9]+$ ]] && [[ "$count" -ge "$min_rows" ]]; then
    ok "Table '$table': $count row(s)"
    ((PASS++))
  else
    warn "Table '$table': unexpected row count ($count)"
    ((FAIL++))
  fi
}

# Verify all core tables are present
REQUIRED_TABLES=(
  "users" "students" "teachers" "guardians"
  "classes" "subjects" "rooms" "departments"
  "attendance" "timetable" "exams" "grades"
  "fees" "payroll" "library_books"
)

for table in "${REQUIRED_TABLES[@]}"; do
  check_table "$table"
done

# Verify at least the schema is non-empty
TABLE_COUNT=$(psql_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" || echo "0")
if [[ "$TABLE_COUNT" -gt 10 ]]; then
  ok "Schema has $TABLE_COUNT tables — looks healthy"
  ((PASS++))
else
  warn "Only $TABLE_COUNT tables found — restore may be incomplete"
  ((FAIL++))
fi

# ── SUMMARY ───────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "  ${GREEN}✅ RESTORE TEST PASSED${NC}"
else
  echo -e "  ${RED}❌ RESTORE TEST FAILED — $FAIL check(s) failed${NC}"
fi
echo "  Pass: $PASS | Fail: $FAIL"
echo "════════════════════════════════════════════════════════"

[[ "$FAIL" -gt 0 ]] && exit 1
exit 0
