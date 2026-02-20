#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Load Test Orchestrator
#
# Runs k6 scenarios in sequence and generates timestamped reports.
#
# Usage:
#   bash performance/scripts/run-load-tests.sh                  # smoke only
#   bash performance/scripts/run-load-tests.sh full             # all scenarios
#   bash performance/scripts/run-load-tests.sh stress           # stress only
#   BASE_URL=http://staging.preskool.internal bash ...
#
# Requirements: k6 (brew install k6)
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
K6_SCRIPT="$PROJECT_ROOT/performance/k6/load-test.js"
REPORT_DIR="$PROJECT_ROOT/performance/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BASE_URL="${BASE_URL:-http://localhost:8000}"
MODE="${1:-smoke}"

mkdir -p "$REPORT_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}[LOAD]${NC}  $*"; }
ok()   { echo -e "${GREEN}[PASS]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; }

PASS=0; FAIL=0

run_scenario() {
  local scenario="$1"
  local label="${2:-$scenario}"
  local report_file="$REPORT_DIR/k6-${scenario}-${TIMESTAMP}.json"

  log "Running k6 scenario: $label (BASE_URL=$BASE_URL)..."
  if k6 run \
    --env "BASE_URL=$BASE_URL" \
    --env "SCENARIO=$scenario" \
    --out "json=$report_file" \
    "$K6_SCRIPT"; then
    ok "$label passed ✓ (report: $(basename "$report_file"))"
    ((PASS++))
  else
    fail "$label FAILED"
    ((FAIL++))
  fi
  echo ""
}

echo "════════════════════════════════════════════════════════"
echo "  PreSkool ERP — Load Tests | $(date)"
echo "  Mode: $MODE | Target: $BASE_URL"
echo "════════════════════════════════════════════════════════"
echo ""

if ! command -v k6 &>/dev/null; then
  fail "k6 not installed. Install with: brew install k6  OR  https://k6.io/docs/get-started/installation/"
  exit 1
fi

case "$MODE" in
  smoke)
    run_scenario "smoke" "Smoke (2 VUs / 30s)"
    ;;
  load)
    run_scenario "smoke"     "Smoke (2 VUs / 30s)"
    run_scenario "load_test" "Load (ramp 50→100→150 VUs / 10m)"
    ;;
  stress)
    run_scenario "smoke"       "Smoke (2 VUs / 30s)"
    run_scenario "stress_test" "Stress (ramp 100→200→300 VUs / 14m)"
    ;;
  spike)
    run_scenario "smoke"      "Smoke (2 VUs / 30s)"
    run_scenario "spike_test" "Spike (500 VU burst)"
    ;;
  soak)
    run_scenario "smoke"     "Smoke (2 VUs / 30s)"
    run_scenario "soak_test" "Soak (50 VUs / 30m)"
    ;;
  full)
    run_scenario "smoke"       "Smoke (2 VUs / 30s)"
    run_scenario "load_test"   "Load (ramp 50→100→150 VUs / 10m)"
    run_scenario "stress_test" "Stress (ramp 100→200→300 VUs / 14m)"
    run_scenario "spike_test"  "Spike (500 VU burst)"
    run_scenario "soak_test"   "Soak (50 VUs / 30m)"
    ;;
  *)
    echo "Usage: $0 [smoke|load|stress|spike|soak|full]"
    exit 1
    ;;
esac

echo "════════════════════════════════════════════════════════"
echo -e "  ${BOLD}Results:${NC} ${GREEN}$PASS passed${NC} | ${RED}$FAIL failed${NC}"
echo "  Reports: $REPORT_DIR/k6-*-$TIMESTAMP.json"
echo "════════════════════════════════════════════════════════"

[[ "$FAIL" -gt 0 ]] && exit 1
exit 0
