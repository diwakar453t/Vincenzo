#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Automated Rollback Script
#
# Rolls back the production (or staging) deployment to a previous version.
# Handles: K8s image rollback, DB migration downgrade, Redis cache flush.
#
# Usage:
#   bash scripts/rollback.sh                    # Interactive: pick from last 5
#   bash scripts/rollback.sh <commit-sha>       # Roll back to specific SHA
#   bash scripts/rollback.sh --db-only          # Downgrade DB migration only
#   bash scripts/rollback.sh --frontend-only    # Roll back frontend only
#   bash scripts/rollback.sh --list             # List available rollback targets
#
# Environment:
#   NAMESPACE       K8s namespace (default: preskool)
#   REGISTRY        Container registry (default: ghcr.io)
#   IMAGE_PREFIX    Image prefix (default: your-org/preskool)
#   DRY_RUN         Set to 'true' to print commands without executing
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

NAMESPACE="${NAMESPACE:-preskool}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${IMAGE_PREFIX:-your-org/preskool}"
DRY_RUN="${DRY_RUN:-false}"

RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()    { echo -e "${BLUE}[ROLLBACK]${NC} $*"; }
ok()     { echo -e "${GREEN}[OK]${NC}      $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}     $*"; }
fail()   { echo -e "${RED}[FAIL]${NC}    $*"; }
dry()    { echo -e "${YELLOW}[DRY-RUN]${NC}  Would run: $*"; }

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    dry "$*"
  else
    eval "$*"
  fi
}

require_cmd() {
  command -v "$1" &>/dev/null || { fail "$1 is required but not installed"; exit 1; }
}

# ── Argument parsing ──────────────────────────────────────────────────
MODE="full"
TARGET_SHA=""

case "${1:-}" in
  --list)
    MODE="list";;
  --db-only)
    MODE="db-only";;
  --frontend-only)
    MODE="frontend-only";;
  "")
    MODE="interactive";;
  --*)
    echo "Usage: $0 [--list|--db-only|--frontend-only|<commit-sha>]"
    exit 1;;
  *)
    TARGET_SHA="$1"
    MODE="full";;
esac

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║    PreSkool ERP — Rollback Script                     ║"
echo "║    $(date)              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

require_cmd kubectl

# ── List recent deployments ───────────────────────────────────────────
if [[ "$MODE" == "list" ]]; then
  log "Recent deployment history (K8s ReplicaSets):"
  kubectl rollout history deployment/backend -n "$NAMESPACE" 2>/dev/null || warn "Could not get backend history"
  kubectl rollout history deployment/frontend -n "$NAMESPACE" 2>/dev/null || warn "Could not get frontend history"
  echo ""
  log "Deployment records:"
  ls -lt deployment-records/*.json 2>/dev/null | head -10 | while read line; do
    echo "  $line"
  done
  exit 0
fi

# ── Interactive: pick from recent deployments ─────────────────────────
if [[ "$MODE" == "interactive" ]]; then
  echo "Recent deployments:"
  echo ""
  if ls deployment-records/*.json &>/dev/null; then
    i=1
    declare -a SHAS=()
    while IFS= read -r file; do
      sha=$(python3 -c "import json; d=json.load(open('$file')); print(d.get('sha','?')[:12])" 2>/dev/null || echo "?")
      ts=$(python3 -c "import json; d=json.load(open('$file')); print(d.get('timestamp','?'))" 2>/dev/null || echo "?")
      deployer=$(python3 -c "import json; d=json.load(open('$file')); print(d.get('deployer','?'))" 2>/dev/null || echo "?")
      echo "  [$i] SHA: $sha | Time: $ts | By: $deployer"
      SHAS+=("$sha")
      ((i++))
    done < <(ls -t deployment-records/*.json 2>/dev/null | head -5)
    echo ""
    echo -n "Pick a deployment to roll back to [1-${#SHAS[@]}] (or 'q' to quit): "
    read -r CHOICE
    [[ "$CHOICE" == "q" ]] && exit 0
    TARGET_SHA="${SHAS[$((CHOICE-1))]}"
    log "Rolling back to: $TARGET_SHA"
  else
    warn "No deployment records found. Using K8s previous revision."
    TARGET_SHA="PREVIOUS"
  fi
  MODE="full"
fi

# ── Confirm rollback ──────────────────────────────────────────────────
if [[ "$DRY_RUN" != "true" ]]; then
  echo -e "${RED}${BOLD}⚠️  WARNING: This will roll back production!${NC}"
  echo "   Namespace: $NAMESPACE"
  [[ -n "$TARGET_SHA" ]] && echo "   Target : $TARGET_SHA" || echo "   Target : Previous K8s revision"
  echo ""
  echo -n "Type 'rollback' to confirm or Ctrl+C to abort: "
  read -r CONFIRM
  [[ "$CONFIRM" != "rollback" ]] && { echo "Aborted."; exit 1; }
fi

START_TIME=$(date +%s)

# ── Step 1: Pre-rollback snapshot ────────────────────────────────────
log "Step 1: Recording current state..."
CURRENT_BACKEND=$(kubectl get deployment backend -n "$NAMESPACE" \
  -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "unknown")
CURRENT_FRONTEND=$(kubectl get deployment frontend -n "$NAMESPACE" \
  -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "unknown")
log "Current backend image: $CURRENT_BACKEND"
log "Current frontend image: $CURRENT_FRONTEND"

# ── Step 2: Roll back backend ─────────────────────────────────────────
if [[ "$MODE" != "frontend-only" ]]; then
  log "Step 2: Rolling back backend deployment..."
  if [[ -n "$TARGET_SHA" ]] && [[ "$TARGET_SHA" != "PREVIOUS" ]]; then
    run "kubectl set image deployment/backend \
      backend=${REGISTRY}/${IMAGE_PREFIX}-backend:${TARGET_SHA} \
      -n ${NAMESPACE}"
  else
    run "kubectl rollout undo deployment/backend -n ${NAMESPACE}"
  fi
  run "kubectl rollout status deployment/backend -n ${NAMESPACE} --timeout=120s"
  ok "Backend rollback complete"
fi

# ── Step 3: Roll back frontend ────────────────────────────────────────
if [[ "$MODE" != "db-only" ]]; then
  log "Step 3: Rolling back frontend deployment..."
  if [[ -n "$TARGET_SHA" ]] && [[ "$TARGET_SHA" != "PREVIOUS" ]]; then
    run "kubectl set image deployment/frontend \
      frontend=${REGISTRY}/${IMAGE_PREFIX}-frontend:${TARGET_SHA} \
      -n ${NAMESPACE}"
  else
    run "kubectl rollout undo deployment/frontend -n ${NAMESPACE}"
  fi
  run "kubectl rollout status deployment/frontend -n ${NAMESPACE} --timeout=60s"
  ok "Frontend rollback complete"
fi

# ── Step 4: Downgrade DB migration (if needed) ───────────────────────
if [[ "$MODE" == "db-only" ]] || [[ "${ROLLBACK_DB:-false}" == "true" ]]; then
  warn "Step 4: Rolling back database migration (downgrade -1)..."
  echo -n "Are you sure you want to downgrade the DB schema? Type 'yes': "
  read -r DB_CONFIRM
  if [[ "$DB_CONFIRM" == "yes" ]]; then
    BACKEND_POD=$(kubectl get pod -n "$NAMESPACE" -l app=backend \
      -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [[ -n "$BACKEND_POD" ]]; then
      run "kubectl exec $BACKEND_POD -n $NAMESPACE -- alembic downgrade -1"
      ok "DB migration rolled back"
    else
      fail "No backend pod found — cannot run migration downgrade"
    fi
  else
    log "DB migration downgrade skipped"
  fi
else
  log "Step 4: DB migration rollback skipped (set ROLLBACK_DB=true to enable)"
fi

# ── Step 5: Flush Redis cache ─────────────────────────────────────────
if [[ "${FLUSH_CACHE:-false}" == "true" ]] || [[ "$MODE" == "full" ]]; then
  log "Step 5: Flushing Redis cache (stale data after rollback)..."
  REDIS_POD=$(kubectl get pod -n "$NAMESPACE" -l app=redis \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  if [[ -n "$REDIS_POD" ]]; then
    run "kubectl exec $REDIS_POD -n $NAMESPACE -- redis-cli FLUSHDB"
    ok "Redis cache flushed"
  else
    warn "No Redis pod found — skipping cache flush"
  fi
fi

# ── Step 6: Verify health ─────────────────────────────────────────────
log "Step 6: Verifying post-rollback health..."
sleep 5

BACKEND_PODS_OK=$(kubectl get pods -n "$NAMESPACE" -l app=backend \
  --no-headers 2>/dev/null | grep -c "Running" || echo "0")
FRONTEND_PODS_OK=$(kubectl get pods -n "$NAMESPACE" -l app=frontend \
  --no-headers 2>/dev/null | grep -c "Running" || echo "0")

if [[ "$BACKEND_PODS_OK" -gt 0 ]]; then
  ok "Backend: $BACKEND_PODS_OK pod(s) Running"
else
  fail "Backend pods are NOT running after rollback!"
fi

if [[ "$FRONTEND_PODS_OK" -gt 0 ]]; then
  ok "Frontend: $FRONTEND_PODS_OK pod(s) Running"
fi

# Health endpoint check
TARGET_URL="${TARGET_URL:-https://erp.preskool.com}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$TARGET_URL/api/v1/health" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "Health check: HTTP 200 ✓"
else
  warn "Health check returned HTTP $HTTP_CODE — service may still be starting"
fi

# ── Summary ───────────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}${BOLD}Rollback Complete${NC} (${ELAPSED}s)"
echo "║  Rolled back to: ${TARGET_SHA:-previous revision}"
echo "║  Namespace: $NAMESPACE"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║  Next Steps:"
echo "║  1. Monitor Grafana: https://grafana.preskool.com"
echo "║  2. Post in #preskool-incidents with rollback reason"
echo "║  3. Open a JIRA ticket for root cause investigation"
echo "║  4. Schedule postmortem within 72 hours"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
