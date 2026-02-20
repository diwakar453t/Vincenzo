#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Performance Analysis Script
#
# Queries Prometheus, PostgreSQL, and Redis for metrics-driven insights.
# Generates a ranked list of optimization opportunities.
#
# Usage:
#   bash scripts/perf-analysis.sh
#   SKIP_PROMETHEUS=true bash scripts/perf-analysis.sh    # skip Prometheus
#   SKIP_DB=true bash scripts/perf-analysis.sh            # skip DB queries
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
DB_HOST="${DB_HOST:-localhost}"; DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-preskool_db}"; DB_USER="${DB_USER:-preskool}"
REDIS_HOST="${REDIS_HOST:-localhost}"; REDIS_PORT="${REDIS_PORT:-6379}"
REPORT_DIR="${REPORT_DIR:-docs/monitoring/reports}"
SKIP_PROMETHEUS="${SKIP_PROMETHEUS:-false}"
SKIP_DB="${SKIP_DB:-false}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT="$REPORT_DIR/perf-analysis-$TIMESTAMP.md"
mkdir -p "$REPORT_DIR"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

section() { echo -e "\n${BOLD}── $* ──────────────────────────────────────────${NC}"; }
ok()      { echo -e "  ${GREEN}✅${NC} $*"; }
warn()    { echo -e "  ${YELLOW}⚠️ ${NC} $*"; }
bad()     { echo -e "  ${RED}🔴${NC} $*"; }
rpt()     { echo "$*" >> "$REPORT"; }

prom_query() {
  # Usage: prom_query 'PromQL expression'  → returns scalar or first value
  local query="$1"
  curl -s --max-time 10 "$PROMETHEUS_URL/api/v1/query" \
    --data-urlencode "query=$query" 2>/dev/null \
    | python3 -c "
import sys,json
try:
  d = json.load(sys.stdin)
  results = d.get('data',{}).get('result',[])
  if results:
    print(results[0]['value'][1])
  else:
    print('N/A')
except:
  print('N/A')
" 2>/dev/null || echo "N/A"
}

cat > "$REPORT" << EOF
# PreSkool ERP — Performance Analysis Report
**Generated:** $(date)

---
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  PreSkool ERP — Performance Analysis                  ║"
echo "║  $(date)                ║"
echo "╚═══════════════════════════════════════════════════════╝"

# ── 1. API Latency from Prometheus ────────────────────────────────────
section "1. API Endpoint Latency (from Prometheus)"
rpt $'\n## 1. API Endpoint Latency'

if [[ "$SKIP_PROMETHEUS" == "true" ]]; then
  echo "  ⏭️  Skipped (SKIP_PROMETHEUS=true)"
  rpt "Skipped."
else
  echo "  Querying top-10 slowest endpoints (P95)..."
  rpt "| Endpoint | Method | P95 (ms) | P99 (ms) | RPS |"
  rpt "|----------|--------|----------|----------|-----|"

  # Get top slow endpoints
  SLOW_ENDPOINTS=$(curl -s --max-time 15 "$PROMETHEUS_URL/api/v1/query" \
    --data-urlencode 'query=topk(10, histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[10m])) by (le, handler, method)) * 1000)' \
    2>/dev/null | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  for r in d.get('data',{}).get('result',[]):
    method=r['metric'].get('method','?')
    handler=r['metric'].get('handler','?')
    val=float(r['value'][1])
    print(f'{handler}|{method}|{val:.0f}')
except Exception as e:
  print(f'error|?|0')
" 2>/dev/null || echo "")

  if [[ -n "$SLOW_ENDPOINTS" ]]; then
    while IFS='|' read -r handler method p95; do
      P99=$(prom_query "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{handler=\"$handler\",method=\"$method\"}[10m])) by (le)) * 1000" 2>/dev/null || echo "N/A")
      RPS=$(prom_query "sum(rate(http_requests_total{handler=\"$handler\",method=\"$method\"}[5m]))" 2>/dev/null || echo "N/A")
      rpt "| $handler | $method | ${p95}ms | $P99 | $RPS |"
      if (( $(echo "$p95 > 1000" | bc -l 2>/dev/null || echo 0) )); then
        bad "$handler ($method): P95=${p95}ms — SLOW (> 1s)"; else
        [[ $(echo "$p95 > 500" | bc -l 2>/dev/null || echo 0) -eq 1 ]] && \
          warn "$handler ($method): P95=${p95}ms — watch this" || \
          ok "$handler ($method): P95=${p95}ms"
      fi
    done <<< "$SLOW_ENDPOINTS"
  else
    warn "No Prometheus latency data (is the backend instrumented?)"
    rpt "No data available."
  fi

  # Overall metrics
  ERROR_RATE=$(prom_query 'sum(rate(http_requests_total{status_code=~"5.."}[10m])) / sum(rate(http_requests_total[10m])) * 100')
  AVG_P95=$(prom_query 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[10m])) by (le)) * 1000')
  TOTAL_RPS=$(prom_query 'sum(rate(http_requests_total[5m]))')

  echo ""
  ok "Error rate (10m): ${ERROR_RATE}%"
  ok "Global P95 latency: ${AVG_P95}ms"
  ok "Total RPS: $TOTAL_RPS"
  rpt $'\n### Overall\n'
  rpt "- Error rate: ${ERROR_RATE}%  | P95: ${AVG_P95}ms | RPS: $TOTAL_RPS"
fi

# ── 2. DB Slow Queries ────────────────────────────────────────────────
section "2. Database Slow Queries (pg_stat_statements)"
rpt $'\n## 2. Database Slow Queries'

if [[ "$SKIP_DB" == "true" ]]; then
  echo "  ⏭️  Skipped (SKIP_DB=true)"
elif ! command -v psql &>/dev/null; then
  echo "  ⏭️  psql not installed"
else
  rpt "| Avg (ms) | Total (ms) | Calls | Query |"
  rpt "|----------|-----------|-------|-------|"

  PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USER" -d "$DB_NAME" -t -A -F'|' 2>/dev/null << 'SQLEOF' | while IFS='|' read -r avg_ms total_ms calls query; do
SELECT
  round(mean_exec_time::numeric, 1) AS avg_ms,
  round(total_exec_time::numeric, 0) AS total_ms,
  calls,
  left(query, 100) AS query_snippet
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 10;
SQLEOF
    rpt "| ${avg_ms}ms | ${total_ms}ms | $calls | \`${query}\` |"
    if (( $(echo "${avg_ms:-0} > 500" | bc -l 2>/dev/null || echo 0) )); then
      bad "Avg ${avg_ms}ms: ${query:0:80}"
    elif (( $(echo "${avg_ms:-0} > 200" | bc -l 2>/dev/null || echo 0) )); then
      warn "Avg ${avg_ms}ms: ${query:0:80}"
    else
      ok "Avg ${avg_ms}ms — OK"
    fi
  done && true || echo "  ⏭️  pg_stat_statements not enabled or not accessible"

  # Index usage
  echo ""
  echo "  Checking for tables with high sequential scan ratio..."
  PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USER" -d "$DB_NAME" -t 2>/dev/null << 'SQLEOF' | while IFS='|' read -r tbl seq idx; do
SELECT tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND (idx_scan IS NULL OR seq_scan > idx_scan * 3)
ORDER BY seq_scan DESC LIMIT 5;
SQLEOF
    warn "Table '$tbl' — seq_scan: $seq, idx_scan: ${idx:-0} → Consider adding index"
    rpt "- ⚠️ Table \`$tbl\`: seq_scan=$seq, idx_scan=${idx:-0}"
  done && true || true
fi

# ── 3. Redis Cache Hit Rate ───────────────────────────────────────────
section "3. Redis Cache Performance"
rpt $'\n## 3. Redis Cache'

if command -v redis-cli &>/dev/null; then
  HITS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info stats 2>/dev/null \
    | grep keyspace_hits | cut -d: -f2 | tr -d $'\r ') || HITS="0"
  MISSES=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info stats 2>/dev/null \
    | grep keyspace_misses | cut -d: -f2 | tr -d $'\r ') || MISSES="0"
  MEM=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory 2>/dev/null \
    | grep used_memory_human | cut -d: -f2 | tr -d $'\r ') || MEM="?"
  MAX_MEM=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory 2>/dev/null \
    | grep maxmemory_human | cut -d: -f2 | tr -d $'\r ') || MAX_MEM="?"

  TOTAL=$(( ${HITS:-0} + ${MISSES:-0} ))
  if [[ "$TOTAL" -gt 0 ]]; then
    HIT_RATE=$(echo "scale=1; ${HITS:-0} * 100 / $TOTAL" | bc 2>/dev/null || echo "?")
    [[ "${HIT_RATE%.*}" -ge 70 ]] && ok "Cache hit rate: ${HIT_RATE}% (target ≥ 70%)" || \
      bad "Cache hit rate: ${HIT_RATE}% — below target!"
    rpt "- Hit rate: ${HIT_RATE}% | Memory: $MEM / $MAX_MEM"
    rpt "- Hits: $HITS | Misses: $MISSES"
  else
    warn "No cache stats available (cache may be empty)"
  fi
else
  warn "redis-cli not installed"
fi

# ── 4. Frontend Bundle Sizes ──────────────────────────────────────────
section "4. Frontend Bundle Sizes"
rpt $'\n## 4. Frontend Bundle Sizes'

DIST_DIR="frontend/dist/assets"
if [[ -d "$DIST_DIR" ]]; then
  LARGE_CHUNKS=$(find "$DIST_DIR" -name "*.js" -size +500k 2>/dev/null | sort -k5 -rn)
  TOTAL_JS=$(find "$DIST_DIR" -name "*.js" -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1 || echo "?")
  ok "Total JS bundle: $TOTAL_JS"
  rpt "- Total JS: $TOTAL_JS"

  if [[ -n "$LARGE_CHUNKS" ]]; then
    bad "Chunks over 500KB:"
    rpt "### Oversized Chunks (>500KB)"
    while IFS= read -r f; do
      SIZE=$(du -sh "$f" | cut -f1)
      bad "  → $(basename "$f"): $SIZE"
      rpt "- \`$(basename "$f")\`: $SIZE"
    done <<< "$LARGE_CHUNKS"
    echo ""
    warn "Recommendation: Use dynamic import() for large modules"
  else
    ok "All JS chunks under 500KB ✓"
    rpt "- ✅ All JS chunks under 500KB"
  fi
else
  warn "No dist/assets found — run: npm run build"
  rpt "- No build found"
fi

# ── 5. Recommendations ────────────────────────────────────────────────
section "5. Recommendations"
rpt $'\n## 5. Recommendations'

RECS=()
[[ "$SKIP_PROMETHEUS" == "false" ]] && RECS+=("Review any endpoint with P95 > 500ms in the latency table above")
[[ "$SKIP_DB" == "false" ]] && RECS+=("Add CONCURRENTLY indexes for tables with high seq_scan ratios")
RECS+=("Set Redis maxmemory-policy: allkeys-lru if not set")
RECS+=("Enable pg_stat_statements if not already enabled")
RECS+=("Run: make performance-test for Lighthouse + k6 full results")
rpt ""
for rec in "${RECS[@]}"; do
  echo -e "  📌 $rec"
  rpt "- 📌 $rec"
done

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Analysis complete. Report saved to:"
echo "║  $REPORT"
echo "╚══════════════════════════════════════════════════════╝"
