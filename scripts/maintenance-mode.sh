#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Maintenance Mode Toggle
#
# Gracefully enables/disables a maintenance page by patching the K8s
# nginx ConfigMap to return 503 + HTML for all non-health requests.
#
# Usage:
#   bash scripts/maintenance-mode.sh enable  "Scheduled maintenance 23:00–00:00 IST"
#   bash scripts/maintenance-mode.sh disable
#   bash scripts/maintenance-mode.sh status
#
# Requirements: kubectl with production kubeconfig
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

NAMESPACE="${NAMESPACE:-preskool}"
CONFIGMAP_NAME="${CONFIGMAP_NAME:-nginx-maintenance}"
ACTION="${1:-status}"
REASON="${2:-Scheduled maintenance in progress. We'll be back shortly.}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}[MAINT]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

command -v kubectl &>/dev/null || fail "kubectl not installed"

MAINTENANCE_HTML=$(cat << HTMLEOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PreSkool ERP — Maintenance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white;
    }
    .card {
      text-align: center;
      max-width: 500px;
      padding: 3rem 2rem;
      background: rgba(255,255,255,0.08);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { opacity: 0.8; line-height: 1.6; margin-bottom: 1rem; }
    .reason {
      background: rgba(255,255,255,0.1);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      opacity: 0.9;
    }
    .contact { font-size: 0.8rem; opacity: 0.6; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔧</div>
    <h1>Under Maintenance</h1>
    <p>PreSkool ERP is temporarily unavailable.</p>
    <div class="reason">REASON_PLACEHOLDER</div>
    <p class="contact">For urgent support: support@preskool.com</p>
  </div>
</body>
</html>
HTMLEOF
)

# ── Status ─────────────────────────────────────────────────────────────
if [[ "$ACTION" == "status" ]]; then
  EXISTS=$(kubectl get configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$EXISTS" -gt 0 ]]; then
    echo -e "${YELLOW}${BOLD}⚠️  MAINTENANCE MODE: ACTIVE${NC}"
    kubectl get configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" \
      -o jsonpath='{.metadata.annotations.maintenance-reason}' 2>/dev/null && echo ""
  else
    echo -e "${GREEN}${BOLD}✅ MAINTENANCE MODE: OFF${NC}"
  fi
  exit 0
fi

# ── Enable ─────────────────────────────────────────────────────────────
if [[ "$ACTION" == "enable" ]]; then
  log "Enabling maintenance mode..."
  log "Reason: $REASON"

  HTML_CONTENT="${MAINTENANCE_HTML/REASON_PLACEHOLDER/$REASON}"

  # Store original deployment replicas for restore
  BACKEND_REPLICAS=$(kubectl get deployment backend -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "2")
  FRONTEND_REPLICAS=$(kubectl get deployment frontend -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "2")

  # Create maintenance ConfigMap with meta
  kubectl create configmap "$CONFIGMAP_NAME" \
    -n "$NAMESPACE" \
    --from-literal="maintenance.html=$HTML_CONTENT" \
    --from-literal="active=true" \
    --dry-run=client -o yaml | kubectl apply -f -

  kubectl annotate configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" \
    "maintenance-enabled-at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "maintenance-reason=$REASON" \
    "backend-replicas=$BACKEND_REPLICAS" \
    "frontend-replicas=$FRONTEND_REPLICAS" \
    --overwrite

  ok "Maintenance ConfigMap created"
  warn "Next: Update nginx Deployment to mount this ConfigMap and return 503"
  warn "Or configure your ingress/CDN to redirect to a static maintenance page"

  echo ""
  echo -e "${YELLOW}${BOLD}MAINTENANCE MODE ENABLED${NC}"
  echo "Reason: $REASON"
  echo "To disable: bash scripts/maintenance-mode.sh disable"
  exit 0
fi

# ── Disable ─────────────────────────────────────────────────────────────
if [[ "$ACTION" == "disable" ]]; then
  EXISTS=$(kubectl get configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$EXISTS" -eq 0 ]]; then
    warn "Maintenance mode is not active"
    exit 0
  fi

  log "Disabling maintenance mode..."

  kubectl delete configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" 2>/dev/null && true
  ok "Maintenance ConfigMap removed"

  echo ""
  echo -e "${GREEN}${BOLD}MAINTENANCE MODE DISABLED${NC}"
  echo "Normal traffic restored."

  # Health check
  sleep 5
  TARGET_URL="${TARGET_URL:-https://erp.preskool.com}"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$TARGET_URL/api/v1/health" 2>/dev/null || echo "000")
  [[ "$HTTP" == "200" ]] && ok "Health check: HTTP 200 ✓" || warn "Health check returned HTTP $HTTP"
  exit 0
fi

echo "Usage: $0 [enable <reason>|disable|status]"
exit 1
