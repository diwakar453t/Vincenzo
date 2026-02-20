#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Performance Test Orchestrator
#
# Runs all performance checks in sequence:
#   1. Production build (Vite)
#   2. Lighthouse CI (Core Web Vitals)
#   3. k6 smoke test
#   4. Generates summary report
#
# Usage:
#   bash performance/scripts/run-performance-tests.sh
#   SKIP_BUILD=true bash performance/scripts/run-performance-tests.sh
#   SKIP_K6=true    bash performance/scripts/run-performance-tests.sh
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
PERF_DIR="$PROJECT_ROOT/performance"
REPORT_DIR="$PERF_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUMMARY_FILE="$REPORT_DIR/perf-summary-$TIMESTAMP.md"

mkdir -p "$REPORT_DIR"

RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0
log()  { echo -e "${BLUE}[PERF]${NC}  $*"; }
ok()   { echo -e "${GREEN}[PASS]${NC}  $*"; ((PASS++)); }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; ((WARN++)); }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; ((FAIL++)); }

echo "════════════════════════════════════════════════════════"
echo "  PreSkool ERP — Performance Tests | $(date)"
echo "════════════════════════════════════════════════════════"

cat > "$SUMMARY_FILE" << EOF
# Performance Test Summary
**Date:** $(date)
**Commit:** $(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "N/A")

---
EOF

# ── 1. Production build ───────────────────────────────────────────────
if [[ "${SKIP_BUILD:-false}" != "true" ]]; then
  log "Building production bundle..."
  cd "$FRONTEND_DIR"
  if npx vite build 2>&1 | tee /tmp/vite-build.log | grep -q "built in"; then
    BUILD_TIME=$(grep "built in" /tmp/vite-build.log | grep -oE "[0-9]+\.[0-9]+s" | head -1)
    ok "Vite build succeeded ($BUILD_TIME)"
    echo "## 1. Build" >> "$SUMMARY_FILE"
    echo "- ✅ Production build succeeded in $BUILD_TIME" >> "$SUMMARY_FILE"
    # Report chunk sizes
    echo "" >> "$SUMMARY_FILE"
    echo "### Chunk Sizes" >> "$SUMMARY_FILE"
    echo "\`\`\`" >> "$SUMMARY_FILE"
    grep -E "\.js.*kB" /tmp/vite-build.log | sort -t'│' -k2 -rn | head -15 >> "$SUMMARY_FILE" || true
    echo "\`\`\`" >> "$SUMMARY_FILE"
  else
    fail "Vite build failed — see /tmp/vite-build.log"
    echo "## 1. Build" >> "$SUMMARY_FILE"
    echo "- ❌ Build failed" >> "$SUMMARY_FILE"
  fi
fi

# ── 2. Lighthouse CI ──────────────────────────────────────────────────
log "Running Lighthouse CI..."
echo "" >> "$SUMMARY_FILE"
echo "## 2. Lighthouse Core Web Vitals" >> "$SUMMARY_FILE"

if command -v lhci &>/dev/null; then
  # Start dev server in background for Lighthouse
  cd "$FRONTEND_DIR"
  npm run dev -- --port 5173 &>/tmp/vite-dev.log &
  DEV_PID=$!
  sleep 5  # Wait for server to start

  if lhci autorun --config="$PERF_DIR/lighthouserc.js" 2>/dev/null; then
    ok "Lighthouse CI: all thresholds passed"
    echo "- ✅ All Core Web Vitals within acceptable thresholds" >> "$SUMMARY_FILE"
    echo "- 📄 Detailed reports: \`performance/reports/lhci/\`" >> "$SUMMARY_FILE"
  else
    warn "Lighthouse CI: some thresholds not met (see reports)"
    echo "- ⚠️ Some Lighthouse thresholds failed — review \`performance/reports/lhci/\`" >> "$SUMMARY_FILE"
  fi

  kill "$DEV_PID" 2>/dev/null || true
else
  warn "lhci not installed. Install: npm install -g @lhci/cli"
  echo "- ⚠️ Lighthouse CI not installed. Run: \`npm install -g @lhci/cli\`" >> "$SUMMARY_FILE"
fi

# ── 3. k6 smoke test ──────────────────────────────────────────────────
log "Running k6 smoke test (2 VUs, 30s)..."
echo "" >> "$SUMMARY_FILE"
echo "## 3. k6 Load Test (Smoke)" >> "$SUMMARY_FILE"

if [[ "${SKIP_K6:-false}" != "true" ]] && command -v k6 &>/dev/null; then
  K6_REPORT="$REPORT_DIR/k6-smoke-$TIMESTAMP.json"
  if k6 run \
    --vus 2 \
    --duration 30s \
    --out "json=$K6_REPORT" \
    "$PERF_DIR/k6/load-test.js" 2>&1 | tee /tmp/k6-smoke.log; then
    ok "k6 smoke test passed"
    echo "- ✅ k6 smoke test (2 VUs / 30s) passed" >> "$SUMMARY_FILE"
    # Parse key metrics
    if [[ -f "$K6_REPORT" ]]; then
      P95=$(node -e "
        const lines = require('fs').readFileSync('$K6_REPORT','utf8').split('\n').filter(Boolean);
        const metric = lines.map(l => { try { return JSON.parse(l); } catch { return null; }}).filter(l => l && l.metric === 'http_req_duration' && l.type === 'Point');
        const times = metric.map(m => m.data.value).sort((a,b) => a-b);
        const p95idx = Math.floor(times.length * 0.95);
        console.log(times[p95idx] ? times[p95idx].toFixed(0) + 'ms' : 'N/A');
      " 2>/dev/null || echo "N/A")
      echo "  - p95 response time: $P95" >> "$SUMMARY_FILE"
    fi
  else
    warn "k6 smoke test: some requests failed"
    echo "- ⚠️ k6 smoke test found issues — check /tmp/k6-smoke.log" >> "$SUMMARY_FILE"
  fi
elif [[ "${SKIP_K6:-false}" == "true" ]]; then
  warn "k6 skipped (SKIP_K6=true)"
  echo "- ⏭️ k6 skipped (set SKIP_K6=false to enable)" >> "$SUMMARY_FILE"
else
  warn "k6 not installed. Install: brew install k6"
  echo "- ⚠️ k6 not installed. Run: \`brew install k6\`" >> "$SUMMARY_FILE"
fi

# ── 4. Bundle size check ──────────────────────────────────────────────
log "Checking bundle sizes..."
echo "" >> "$SUMMARY_FILE"
echo "## 4. Bundle Size Check" >> "$SUMMARY_FILE"

DIST_DIR="$FRONTEND_DIR/dist/assets/js"
if [[ -d "$DIST_DIR" ]]; then
  LARGE_CHUNKS=$(find "$DIST_DIR" -name "*.js" -size +500k 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_JS=$(du -sh "$DIST_DIR" 2>/dev/null | cut -f1 || echo "N/A")
  if [[ "$LARGE_CHUNKS" -gt 0 ]]; then
    warn "Bundle: $LARGE_CHUNKS chunks > 500KB"
    echo "- ⚠️ $LARGE_CHUNKS JS chunks exceed 500KB (consider further splitting)" >> "$SUMMARY_FILE"
  else
    ok "Bundle: all JS chunks ≤ 500KB"
    echo "- ✅ All JS chunks within 500KB limit" >> "$SUMMARY_FILE"
  fi
  echo "- Total JS size: $TOTAL_JS" >> "$SUMMARY_FILE"
fi

# ── SUMMARY ───────────────────────────────────────────────────────────
cat >> "$SUMMARY_FILE" << EOF

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Pass    | $PASS |
| ⚠️ Warning | $WARN |
| ❌ Fail    | $FAIL |

**Full report:** \`$SUMMARY_FILE\`
EOF

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "  ${BOLD}Results:${NC} ${GREEN}$PASS pass${NC} | ${YELLOW}$WARN warn${NC} | ${RED}$FAIL fail${NC}"
echo "  Report: $SUMMARY_FILE"
echo "════════════════════════════════════════════════════════"

[[ "$FAIL" -gt 0 ]] && exit 1
exit 0
