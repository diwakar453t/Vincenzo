#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Launch Pre-Flight Checklist
#
# Run this BEFORE every production deployment. Exits 0 only if ALL
# critical checks pass. Non-zero exit blocks the deploy pipeline.
#
# Usage:
#   bash scripts/launch-checklist.sh
#   SKIP_CONNECTIVITY=true bash scripts/launch-checklist.sh   # dry-run / CI
#   TARGET_URL=https://erp.preskool.com bash scripts/launch-checklist.sh
#
# Environment:
#   TARGET_URL          Backend base URL (default: http://localhost:8000)
#   FRONTEND_URL        Frontend URL (default: http://localhost:5173)
#   BACKUP_DIR          Backup directory (default: /var/backups/preskool)
#   NAMESPACE           K8s namespace (default: preskool)
#   SKIP_CONNECTIVITY   Set to 'true' to skip HTTP checks (offline/CI)
#   SKIP_K8S            Set to 'true' to skip kubectl checks
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

TARGET_URL="${TARGET_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/preskool}"
NAMESPACE="${NAMESPACE:-preskool}"
SKIP_CONNECTIVITY="${SKIP_CONNECTIVITY:-false}"
SKIP_K8S="${SKIP_K8S:-false}"

RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0; SKIP=0

ok()   { echo -e "  ${GREEN}✅ PASS${NC}  $*"; ((PASS++)); }
warn() { echo -e "  ${YELLOW}⚠️  WARN${NC}  $*"; ((WARN++)); }
fail() { echo -e "  ${RED}❌ FAIL${NC}  $*"; ((FAIL++)); }
skip() { echo -e "  ${BLUE}⏭️  SKIP${NC}  $*"; ((SKIP++)); }
section() { echo -e "\n${BOLD}── $* ─────────────────────────────────────────${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    PreSkool ERP — Launch Pre-Flight Checklist        ║"
echo "║    $(date)             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Backend Health ─────────────────────────────────────────────────
section "1. Backend Health & Connectivity"

if [[ "$SKIP_CONNECTIVITY" == "true" ]]; then
  skip "Backend health check (SKIP_CONNECTIVITY=true)"
else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$TARGET_URL/api/v1/health" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "Backend health endpoint: $TARGET_URL/api/v1/health → HTTP $HTTP_CODE"
  elif [[ "$HTTP_CODE" == "000" ]]; then
    fail "Backend health endpoint unreachable: $TARGET_URL"
  else
    fail "Backend health endpoint returned HTTP $HTTP_CODE (expected 200)"
  fi

  # Check API response has status: ok
  HEALTH_STATUS=$(curl -s --max-time 10 "$TARGET_URL/api/v1/health" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")
  if [[ "$HEALTH_STATUS" == "ok" ]] || [[ "$HEALTH_STATUS" == "healthy" ]]; then
    ok "Backend status field: '$HEALTH_STATUS'"
  else
    warn "Backend health status field is '$HEALTH_STATUS' (expected 'ok' or 'healthy')"
  fi
fi

# ── 2. Database Connectivity ──────────────────────────────────────────
section "2. Database Connectivity"

if command -v pg_isready &>/dev/null; then
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-preskool_db}"
  DB_USER="${DB_USER:-preskool}"
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -q 2>/dev/null; then
    ok "PostgreSQL accepting connections at $DB_HOST:$DB_PORT/$DB_NAME"
  else
    fail "PostgreSQL not ready at $DB_HOST:$DB_PORT/$DB_NAME"
  fi
else
  skip "pg_isready not installed — skipping direct DB check"
fi

# ── 3. Redis Connectivity ─────────────────────────────────────────────
section "3. Redis Connectivity"

if command -v redis-cli &>/dev/null; then
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  PONG=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null || echo "FAILED")
  if [[ "$PONG" == "PONG" ]]; then
    ok "Redis responding at $REDIS_HOST:$REDIS_PORT"
  else
    fail "Redis not responding at $REDIS_HOST:$REDIS_PORT (got: $PONG)"
  fi
else
  skip "redis-cli not installed — skipping Redis check"
fi

# ── 4. K8s Pod Health ─────────────────────────────────────────────────
section "4. Kubernetes Pods (namespace: $NAMESPACE)"

if [[ "$SKIP_K8S" == "true" ]]; then
  skip "K8s checks (SKIP_K8S=true)"
elif command -v kubectl &>/dev/null; then
  NOT_RUNNING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null \
    | grep -v "Running\|Completed" | wc -l | tr -d ' ')
  TOTAL=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$NOT_RUNNING" -eq 0 ]] && [[ "$TOTAL" -gt 0 ]]; then
    ok "All $TOTAL pods Running in namespace '$NAMESPACE'"
  elif [[ "$TOTAL" -eq 0 ]]; then
    warn "No pods found in namespace '$NAMESPACE' — namespace may not exist yet"
  else
    fail "$NOT_RUNNING/$TOTAL pods are NOT in Running state"
    kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running | head -5 | while read line; do
      echo "    → $line"
    done
  fi
else
  skip "kubectl not installed — skipping K8s pod check"
fi

# ── 5. TLS Certificate ────────────────────────────────────────────────
section "5. TLS Certificate Validity"

if [[ "$SKIP_CONNECTIVITY" == "true" ]]; then
  skip "TLS check (SKIP_CONNECTIVITY=true)"
else
  DOMAIN=$(echo "$TARGET_URL" | sed 's|https://||' | sed 's|/.*||' | sed 's|:.*||')
  if [[ "$TARGET_URL" == https://* ]] && command -v openssl &>/dev/null; then
    EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
      | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
    if [[ -n "$EXPIRY" ]]; then
      EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null || echo "0")
      NOW_EPOCH=$(date +%s)
      DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
      if [[ "$DAYS_LEFT" -gt 30 ]]; then
        ok "TLS certificate valid for $DAYS_LEFT days (expires: $EXPIRY)"
      elif [[ "$DAYS_LEFT" -gt 7 ]]; then
        warn "TLS certificate expires in $DAYS_LEFT days — renew soon!"
      else
        fail "TLS certificate expires in $DAYS_LEFT days — RENEW IMMEDIATELY"
      fi
    else
      warn "Could not check TLS certificate for $DOMAIN"
    fi
  else
    skip "TLS check skipped (HTTP or domain not available)"
  fi
fi

# ── 6. Recent Backup Check ────────────────────────────────────────────
section "6. Backup Recency"

if [[ -d "$BACKUP_DIR" ]]; then
  LATEST=$(ls -t "$BACKUP_DIR"/preskool-backup-*.sql.gz 2>/dev/null | head -1 || true)
  if [[ -n "$LATEST" ]]; then
    AGE_HOURS=$(( ($(date +%s) - $(stat -f %m "$LATEST" 2>/dev/null || stat -c %Y "$LATEST" 2>/dev/null || echo "0")) / 3600 ))
    if [[ "$AGE_HOURS" -le 25 ]]; then
      ok "Latest backup is ${AGE_HOURS}h old: $(basename "$LATEST")"
    else
      fail "Latest backup is ${AGE_HOURS}h old — must be < 25h before production deploy"
    fi
  else
    fail "No backups found in $BACKUP_DIR — take a backup before deploying!"
  fi
else
  warn "Backup directory $BACKUP_DIR does not exist — ensure backups are configured"
fi

# ── 7. Security Audit ─────────────────────────────────────────────────
section "7. Security Audit Status"

LATEST_AUDIT=$(ls -t security/reports/frontend-audit-*.md 2>/dev/null | head -1 || true)
if [[ -n "$LATEST_AUDIT" ]]; then
  AUDIT_AGE=$(( ($(date +%s) - $(stat -f %m "$LATEST_AUDIT" 2>/dev/null || stat -c %Y "$LATEST_AUDIT" 2>/dev/null || echo "0")) / 86400 ))
  AUDIT_FAILS=$(grep -c "❌" "$LATEST_AUDIT" 2>/dev/null || echo "0")
  if [[ "$AUDIT_FAILS" -eq 0 ]]; then
    ok "Latest security audit ($AUDIT_AGE day(s) ago): No FAIL items"
  else
    fail "Security audit has $AUDIT_FAILS FAIL item(s) — resolve before deploying"
  fi
else
  warn "No security audit report found — run: bash security/scripts/frontend-audit.sh"
fi

# ── 8. Frontend Build Artifacts ───────────────────────────────────────
section "8. Frontend Build Artifacts"

DIST_DIR="frontend/dist"
if [[ -d "$DIST_DIR" ]]; then
  HTML_EXISTS=$(ls "$DIST_DIR/index.html" 2>/dev/null | wc -l | tr -d ' ')
  JS_COUNT=$(find "$DIST_DIR/assets" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
  BUILD_SIZE=$(du -sh "$DIST_DIR" 2>/dev/null | cut -f1 || echo "N/A")
  if [[ "$HTML_EXISTS" -gt 0 ]] && [[ "$JS_COUNT" -gt 0 ]]; then
    ok "Frontend build exists: $JS_COUNT JS chunks, total size $BUILD_SIZE"
  else
    fail "Frontend build incomplete: missing index.html or JS chunks in $DIST_DIR"
  fi
else
  fail "Frontend dist/ directory missing — run: npm run build"
fi

# ── VERDICT ───────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo -e "║  ${BOLD}Results:${NC}  ${GREEN}✅ $PASS pass${NC}  ${YELLOW}⚠️  $WARN warn${NC}  ${RED}❌ $FAIL fail${NC}  ${BLUE}⏭️  $SKIP skip${NC}"
if [[ "$FAIL" -gt 0 ]]; then
  echo -e "║  ${RED}${BOLD}VERDICT: ❌ GO-LIVE BLOCKED — $FAIL critical issue(s)${NC}"
elif [[ "$WARN" -gt 0 ]]; then
  echo -e "║  ${YELLOW}${BOLD}VERDICT: ⚠️  GO-LIVE WITH CAUTION — $WARN warning(s)${NC}"
else
  echo -e "║  ${GREEN}${BOLD}VERDICT: ✅ READY FOR PRODUCTION DEPLOYMENT${NC}"
fi
echo "╚══════════════════════════════════════════════════════╝"
echo ""

[[ "$FAIL" -gt 0 ]] && exit 1
exit 0
