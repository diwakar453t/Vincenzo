#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — System Health Check Script
#
# Runs a comprehensive diagnostic of all system components and generates
# a timestamped Markdown report. Safe to run in production (read-only).
#
# Usage:
#   bash scripts/health-check.sh
#   SKIP_K8S=true bash scripts/health-check.sh        # skip kubectl checks
#   SKIP_DB=true bash scripts/health-check.sh          # skip DB checks
#   REPORT_DIR=/tmp bash scripts/health-check.sh       # custom report path
#
# Environment:
#   TARGET_URL      Backend URL  (default: http://localhost:8000)
#   DB_HOST         Postgres host (default: localhost)
#   DB_PORT         Postgres port (default: 5432)
#   DB_NAME         Database name (default: preskool_db)
#   DB_USER         DB user       (default: preskool)
#   REDIS_HOST      Redis host    (default: localhost)
#   NAMESPACE       K8s namespace (default: preskool)
#   REPORT_DIR      Output dir    (default: docs/monitoring/reports)
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

TARGET_URL="${TARGET_URL:-http://localhost:8000}"
DB_HOST="${DB_HOST:-localhost}"; DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-preskool_db}"; DB_USER="${DB_USER:-preskool}"
REDIS_HOST="${REDIS_HOST:-localhost}"; REDIS_PORT="${REDIS_PORT:-6379}"
NAMESPACE="${NAMESPACE:-preskool}"
REPORT_DIR="${REPORT_DIR:-docs/monitoring/reports}"
SKIP_K8S="${SKIP_K8S:-false}"; SKIP_DB="${SKIP_DB:-false}"
SKIP_REDIS="${SKIP_REDIS:-false}"; SKIP_CONNECTIVITY="${SKIP_CONNECTIVITY:-false}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT="$REPORT_DIR/health-report-$TIMESTAMP.md"
mkdir -p "$REPORT_DIR"

RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0; SKIP=0
declare -a ISSUES=()

# ── Helpers ───────────────────────────────────────────────────────────
ok()   { echo -e "  ${GREEN}✅${NC} $*"; ((PASS++)); }
warn() { echo -e "  ${YELLOW}⚠️ ${NC} $*"; ((WARN++)); ISSUES+=("WARN: $*"); }
fail() { echo -e "  ${RED}❌${NC} $*"; ((FAIL++)); ISSUES+=("FAIL: $*"); }
skip() { echo -e "  ${BLUE}⏭️ ${NC} $*"; ((SKIP++)); }
section() { echo -e "\n${BOLD}── $* ──────────────────────────────────────────${NC}"; }
rpt() { echo "$*" >> "$REPORT"; }  # write to report

# ── Init report ───────────────────────────────────────────────────────
cat > "$REPORT" << EOF
# PreSkool ERP Health Report
**Generated:** $(date)
**Target:** $TARGET_URL

---
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  PreSkool ERP — System Health Check                   ║"
echo "║  $(date)                ║"
echo "╚═══════════════════════════════════════════════════════╝"

# ── 1. Backend API Health ─────────────────────────────────────────────
section "1. Backend API"
rpt "## 1. Backend API"

if [[ "$SKIP_CONNECTIVITY" == "true" ]]; then
  skip "API checks (SKIP_CONNECTIVITY=true)"
else
  HTTP_CODE=$(curl -s -o /tmp/health_resp.json -w "%{http_code}" \
    --max-time 10 "$TARGET_URL/api/v1/health" 2>/dev/null || echo "000")

  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "Health endpoint: HTTP 200"
    STATUS=$(python3 -c "import json; d=json.load(open('/tmp/health_resp.json')); print(d.get('status','?'))" 2>/dev/null || echo "?")
    VERSION=$(python3 -c "import json; d=json.load(open('/tmp/health_resp.json')); print(d.get('version','?'))" 2>/dev/null || echo "?")
    ok "API status: $STATUS | version: $VERSION"
    rpt "- ✅ Health: HTTP 200 | status=$STATUS | version=$VERSION"
  elif [[ "$HTTP_CODE" == "000" ]]; then
    fail "API unreachable at $TARGET_URL"
    rpt "- ❌ API unreachable"
  else
    fail "API returned HTTP $HTTP_CODE"
    rpt "- ❌ API returned HTTP $HTTP_CODE"
  fi

  # Check response time
  RESP_TIME=$(curl -s -o /dev/null -w "%{time_total}" \
    --max-time 10 "$TARGET_URL/api/v1/health" 2>/dev/null || echo "99")
  RESP_MS=$(echo "$RESP_TIME * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "?")
  if [[ "$RESP_MS" != "?" ]] && [[ "$RESP_MS" -lt 500 ]]; then
    ok "Response time: ${RESP_MS}ms"
    rpt "- ✅ Response time: ${RESP_MS}ms"
  elif [[ "$RESP_MS" != "?" ]]; then
    warn "Response time: ${RESP_MS}ms (threshold: 500ms)"
    rpt "- ⚠️ Response time: ${RESP_MS}ms"
  fi
fi

# ── 2. Database Health ────────────────────────────────────────────────
section "2. Database (PostgreSQL)"
rpt $'\n## 2. Database'

if [[ "$SKIP_DB" == "true" ]]; then
  skip "DB checks (SKIP_DB=true)"
elif ! command -v psql &>/dev/null; then
  skip "psql not installed"
else
  PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" -c "SELECT 1" -q 2>/dev/null >/dev/null && \
    { ok "PostgreSQL connectivity: OK"; rpt "- ✅ PostgreSQL connectivity: OK"; } || \
    { fail "PostgreSQL not reachable at $DB_HOST:$DB_PORT"; rpt "- ❌ PostgreSQL unreachable"; }

  # DB size
  DB_SIZE=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null \
    | tr -d ' \n' || echo "?")
  ok "Database size: $DB_SIZE"
  rpt "- ✅ Database size: $DB_SIZE"

  # Active connections
  ACTIVE_CONN=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" \
    2>/dev/null | tr -d ' \n' || echo "?")
  [[ "$ACTIVE_CONN" != "?" ]] && [[ "$ACTIVE_CONN" -lt 100 ]] && \
    { ok "Active connections: $ACTIVE_CONN"; rpt "- ✅ Active connections: $ACTIVE_CONN"; } || \
    { warn "Active connections: $ACTIVE_CONN (high)"; rpt "- ⚠️ Active connections: $ACTIVE_CONN"; }

  # Long-running queries
  LONG_QUERIES=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state='active' \
    AND now() - query_start > interval '30 seconds';" 2>/dev/null | tr -d ' \n' || echo "0")
  [[ "$LONG_QUERIES" == "0" ]] && \
    { ok "Long queries (>30s): none"; rpt "- ✅ No long-running queries"; } || \
    { warn "Long queries (>30s): $LONG_QUERIES"; rpt "- ⚠️ Long queries: $LONG_QUERIES"; }
fi

# ── 3. Redis Health ───────────────────────────────────────────────────
section "3. Redis Cache"
rpt $'\n## 3. Redis'

if [[ "$SKIP_REDIS" == "true" ]]; then
  skip "Redis checks (SKIP_REDIS=true)"
elif ! command -v redis-cli &>/dev/null; then
  skip "redis-cli not installed"
else
  PONG=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null || echo "FAILED")
  [[ "$PONG" == "PONG" ]] && \
    { ok "Redis: responding"; rpt "- ✅ Redis: PONG"; } || \
    { fail "Redis: not responding ($PONG)"; rpt "- ❌ Redis: $PONG"; }

  if [[ "$PONG" == "PONG" ]]; then
    MEM=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory 2>/dev/null \
      | grep used_memory_human | cut -d: -f2 | tr -d $'\r ')
    KEYS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" dbsize 2>/dev/null || echo "?")
    HITS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info stats 2>/dev/null \
      | grep keyspace_hits | cut -d: -f2 | tr -d $'\r ' || echo "?")
    MISSES=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info stats 2>/dev/null \
      | grep keyspace_misses | cut -d: -f2 | tr -d $'\r ' || echo "?")
    ok "Redis memory: $MEM | keys: $KEYS"
    rpt "- ✅ Memory: $MEM | Keys: $KEYS | Hits: $HITS | Misses: $MISSES"

    if [[ "$HITS" != "?" ]] && [[ "$MISSES" != "?" ]] && \
       [[ "$((HITS + MISSES))" -gt 0 ]]; then
      HIT_RATE=$(echo "scale=1; $HITS * 100 / ($HITS + $MISSES)" | bc 2>/dev/null || echo "?")
      if [[ "$HIT_RATE" != "?" ]]; then
        HIT_INT=${HIT_RATE%.*}
        [[ "$HIT_INT" -ge 70 ]] && ok "Cache hit rate: ${HIT_RATE}%" || \
          warn "Cache hit rate: ${HIT_RATE}% (target ≥ 70%)"
        rpt "- Cache hit rate: ${HIT_RATE}%"
      fi
    fi
  fi
fi

# ── 4. Kubernetes Pods ────────────────────────────────────────────────
section "4. Kubernetes (namespace: $NAMESPACE)"
rpt $'\n## 4. Kubernetes'

if [[ "$SKIP_K8S" == "true" ]]; then
  skip "K8s checks (SKIP_K8S=true)"
elif ! command -v kubectl &>/dev/null; then
  skip "kubectl not installed"
else
  TOTAL=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')
  RUNNING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
  PENDING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Pending" || echo "0")
  CRASHLOOP=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "CrashLoop" || echo "0")

  rpt "- Total pods: $TOTAL | Running: $RUNNING | Pending: $PENDING | CrashLoop: $CRASHLOOP"

  [[ "$RUNNING" == "$TOTAL" ]] && [[ "$TOTAL" -gt 0 ]] && \
    ok "All $TOTAL pods Running" || \
    fail "Pods — Running: $RUNNING/$TOTAL | Pending: $PENDING | CrashLoop: $CRASHLOOP"

  [[ "$CRASHLOOP" -gt 0 ]] && \
    { fail "CrashLooping pods detected!"; rpt "- ❌ CrashLoop pods: $CRASHLOOP"; }

  # HPA status
  HPA_LIST=$(kubectl get hpa -n "$NAMESPACE" --no-headers 2>/dev/null || echo "")
  [[ -n "$HPA_LIST" ]] && { ok "HPA configured"; rpt "- ✅ HPA: configured"; }
fi

# ── 5. Disk & Infrastructure ──────────────────────────────────────────
section "5. Host Resources"
rpt $'\n## 5. Host Resources'

# Disk usage
if command -v df &>/dev/null; then
  DISK_PCT=$(df -h / | awk 'NR==2{gsub(/%/,"",$5); print $5}' 2>/dev/null || echo "?")
  DISK_AVAIL=$(df -h / | awk 'NR==2{print $4}' 2>/dev/null || echo "?")
  if [[ "$DISK_PCT" != "?" ]]; then
    [[ "$DISK_PCT" -lt 80 ]] && ok "Disk: ${DISK_PCT}% used, $DISK_AVAIL available" || \
    [[ "$DISK_PCT" -lt 90 ]] && warn "Disk: ${DISK_PCT}% used — trending high" || \
    fail "Disk CRITICAL: ${DISK_PCT}% used"
    rpt "- Disk: ${DISK_PCT}% used | Available: $DISK_AVAIL"
  fi
fi

# Memory
if [[ -r /proc/meminfo ]]; then
  MEM_TOTAL=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
  MEM_AVAIL=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
  MEM_PCT=$(( (MEM_TOTAL - MEM_AVAIL) * 100 / MEM_TOTAL ))
  [[ "$MEM_PCT" -lt 80 ]] && ok "Memory: ${MEM_PCT}% used" || \
    warn "Memory: ${MEM_PCT}% used (threshold: 80%)"
  rpt "- Memory: ${MEM_PCT}% used"
fi

# ── 6. Backup Recency ─────────────────────────────────────────────────
section "6. Backup Status"
rpt $'\n## 6. Backup Status'

BACKUP_DIR="${BACKUP_DIR:-/var/backups/preskool}"
LATEST=$(ls -t "$BACKUP_DIR"/preskool-backup-*.sql.gz 2>/dev/null | head -1 || true)
if [[ -n "$LATEST" ]]; then
  AGE_H=$(( ($(date +%s) - $(stat -f %m "$LATEST" 2>/dev/null || stat -c %Y "$LATEST" 2>/dev/null || echo 0)) / 3600 ))
  SIZE=$(du -sh "$LATEST" | cut -f1)
  [[ "$AGE_H" -le 25 ]] && ok "Latest backup: $(basename "$LATEST") (${AGE_H}h ago, $SIZE)" || \
    fail "Latest backup is ${AGE_H}h old — must be < 25h"
  rpt "- Latest backup: $(basename "$LATEST") | Age: ${AGE_H}h | Size: $SIZE"
else
  warn "No backups found in $BACKUP_DIR"
  rpt "- ⚠️ No backups found"
fi

# ── Summary ───────────────────────────────────────────────────────────
OVERALL="HEALTHY"
[[ "$FAIL" -gt 0 ]] && OVERALL="CRITICAL"
[[ "$FAIL" -eq 0 ]] && [[ "$WARN" -gt 0 ]] && OVERALL="DEGRADED"

cat >> "$REPORT" << EOF

---
## Summary
| Metric | Count |
|--------|-------|
| ✅ Pass | $PASS |
| ⚠️ Warn | $WARN |
| ❌ Fail | $FAIL |
| ⏭️ Skip | $SKIP |
| **Overall** | **$OVERALL** |

### Issues Found
$(for i in "${ISSUES[@]:-}"; do echo "- $i"; done)
EOF

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo -e "║  ✅ $PASS pass  ⚠️  $WARN warn  ❌ $FAIL fail  ⏭️  $SKIP skip"
echo -e "║  Status: ${BOLD}$OVERALL${NC}"
echo "║  Report: $REPORT"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

[[ "$OVERALL" == "CRITICAL" ]] && exit 1
exit 0
