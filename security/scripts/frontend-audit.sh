#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Frontend Security Audit
# Audits npm dependencies, source code patterns, and build config.
#
# Usage:
#   bash security/scripts/frontend-audit.sh
#   FAIL_ON_MODERATE=true bash security/scripts/frontend-audit.sh
#
# Requirements: node, npm (in PATH)
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
REPORT_DIR="$PROJECT_ROOT/security/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/frontend-audit-$TIMESTAMP.md"

mkdir -p "$REPORT_DIR"

RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0
log()  { echo -e "${BLUE}[AUDIT]${NC} $*"; }
ok()   { echo -e "${GREEN}[PASS]${NC}  $*"; ((PASS++)); }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; ((WARN++)); }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; ((FAIL++)); }

echo "════════════════════════════════════════════════════════"
echo "  PreSkool ERP — Frontend Security Audit | $(date)"
echo "════════════════════════════════════════════════════════"

cat > "$REPORT_FILE" << EOF
# Frontend Security Audit Report
**Generated:** $(date)
**Commit:** $(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "N/A")

---
EOF

# ── 1. npm audit ─────────────────────────────────────────────────────
log "Running npm audit..."
cat >> "$REPORT_FILE" << 'EOF'
## 1. npm Dependency Audit

EOF

cd "$FRONTEND_DIR"
AUDIT_JSON=$(npm audit --json 2>/dev/null || true)
CRITICAL=$(echo "$AUDIT_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.metadata?.vulnerabilities?.critical||0)" 2>/dev/null || echo "0")
HIGH=$(echo "$AUDIT_JSON"     | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.metadata?.vulnerabilities?.high||0)"     2>/dev/null || echo "0")
MODERATE=$(echo "$AUDIT_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.metadata?.vulnerabilities?.moderate||0)" 2>/dev/null || echo "0")
LOW=$(echo "$AUDIT_JSON"      | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.metadata?.vulnerabilities?.low||0)"      2>/dev/null || echo "0")

cat >> "$REPORT_FILE" << EOF
| Severity | Count |
|----------|-------|
| 🔴 Critical | $CRITICAL |
| 🟠 High     | $HIGH     |
| 🟡 Moderate | $MODERATE |
| 🟢 Low      | $LOW      |

EOF

if [[ "$CRITICAL" -gt 0 ]]; then
  fail "npm audit: $CRITICAL CRITICAL vulnerabilities"
  echo "❌ $CRITICAL critical vulnerabilities — run \`npm audit fix\`" >> "$REPORT_FILE"
elif [[ "$HIGH" -gt 0 ]]; then
  warn "npm audit: $HIGH HIGH vulnerabilities"
  echo "⚠️ $HIGH high severity vulnerabilities found." >> "$REPORT_FILE"
elif [[ "$MODERATE" -gt 0 ]] && [[ "${FAIL_ON_MODERATE:-false}" == "true" ]]; then
  warn "npm audit: $MODERATE MODERATE vulnerabilities"
  echo "⚠️ $MODERATE moderate vulnerabilities found." >> "$REPORT_FILE"
else
  ok "npm audit: No critical/high vulnerabilities (moderate: $MODERATE, low: $LOW)"
  echo "✅ No critical/high npm vulnerabilities." >> "$REPORT_FILE"
fi

# ── 2. Hardcoded secrets in src/ ──────────────────────────────────────
log "Scanning for hardcoded secrets in source..."
cat >> "$REPORT_FILE" << 'EOF'

## 2. Hardcoded Secrets Scan

EOF

SECRET_PATTERNS=(
  "password\s*=\s*['\"][^'\"]{6,}"
  "secret\s*=\s*['\"][^'\"]{6,}"
  "api[_-]?key\s*=\s*['\"][^'\"]{8,}"
  "AWS_ACCESS_KEY_ID\s*=\s*[A-Z0-9]{20}"
  "-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  count=$(grep -rEil "$pattern" "$FRONTEND_DIR/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$count" -gt 0 ]]; then
    ((SECRETS_FOUND += count))
    warn "Possible secret pattern found in $count file(s): $pattern"
  fi
done

# Check .env is not committed
ENV_COMMITTED=$(git -C "$PROJECT_ROOT" ls-files "$FRONTEND_DIR/.env" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$ENV_COMMITTED" -gt 0 ]]; then
  fail ".env file is committed to git!"
  echo "🔴 .env is tracked in git — run: git rm --cached frontend/.env" >> "$REPORT_FILE"
elif [[ "$SECRETS_FOUND" -gt 0 ]]; then
  warn "Possible hardcoded secrets in $SECRETS_FOUND file(s)"
  echo "⚠️ Possible hardcoded secrets found. Review the files above." >> "$REPORT_FILE"
else
  ok "No hardcoded secrets detected in src/"
  echo "✅ No hardcoded secrets detected." >> "$REPORT_FILE"
fi

# ── 3. Source maps check (should not expose in production) ────────────
log "Checking build source map configuration..."
cat >> "$REPORT_FILE" << 'EOF'

## 3. Source Maps Check

EOF

SOURCEMAP_ENABLED=$(grep -E "sourcemap\s*[=:]\s*true" "$FRONTEND_DIR/vite.config.ts" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$SOURCEMAP_ENABLED" -gt 0 ]]; then
  warn "Source maps appear to be enabled in vite.config.ts — disable for production"
  echo "⚠️ Source maps enabled: set \`build.sourcemap = false\` for production builds." >> "$REPORT_FILE"
else
  ok "Source maps not explicitly enabled in build config"
  echo "✅ Source maps not enabled (good for production)." >> "$REPORT_FILE"
fi

# ── 4. Content-Security-Policy header check ───────────────────────────
log "Checking Content-Security-Policy in nginx config..."
cat >> "$REPORT_FILE" << 'EOF'

## 4. Security Headers (nginx)

EOF

check_nginx_header() {
  local header="$1"
  local found
  found=$(grep -c "$header" "$FRONTEND_DIR/nginx.conf" 2>/dev/null || echo "0")
  if [[ "$found" -gt 0 ]]; then
    ok "nginx: $header present"
    echo "- ✅ $header" >> "$REPORT_FILE"
  else
    warn "nginx: $header MISSING — add to nginx.conf"
    echo "- ⚠️ $header not set" >> "$REPORT_FILE"
  fi
}

check_nginx_header "X-Frame-Options"
check_nginx_header "X-Content-Type-Options"
check_nginx_header "Referrer-Policy"
check_nginx_header "X-XSS-Protection"

# CSP is optional but recommended
CSP_FOUND=$(grep -c "Content-Security-Policy" "$FRONTEND_DIR/nginx.conf" 2>/dev/null || echo "0")
if [[ "$CSP_FOUND" -gt 0 ]]; then
  ok "nginx: Content-Security-Policy present"
  echo "- ✅ Content-Security-Policy" >> "$REPORT_FILE"
else
  warn "nginx: Content-Security-Policy NOT set — recommended for production"
  echo "- ⚠️ Content-Security-Policy not set (recommended, add to nginx.conf)" >> "$REPORT_FILE"
fi

# ── 5. TypeScript strict mode ─────────────────────────────────────────
log "Checking TypeScript strict configuration..."
cat >> "$REPORT_FILE" << 'EOF'

## 5. TypeScript Security Config

EOF

TS_STRICT=$(grep -c '"strict": true' "$FRONTEND_DIR/tsconfig.app.json" 2>/dev/null || echo "0")
if [[ "$TS_STRICT" -gt 0 ]]; then
  ok "TypeScript strict mode enabled"
  echo "- ✅ TypeScript strict mode enabled" >> "$REPORT_FILE"
else
  warn "TypeScript strict mode not enabled — enables type-safety checks"
  echo "- ⚠️ TypeScript strict mode not set in tsconfig.app.json" >> "$REPORT_FILE"
fi

# ── SUMMARY ───────────────────────────────────────────────────────────
cat >> "$REPORT_FILE" << EOF

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Pass | $PASS |
| ⚠️ Warning | $WARN |
| ❌ Fail | $FAIL |

**Report saved to:** \`$REPORT_FILE\`
EOF

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "  ${BOLD}Results:${NC} ${GREEN}$PASS pass${NC} | ${YELLOW}$WARN warn${NC} | ${RED}$FAIL fail${NC}"
echo "  Report: $REPORT_FILE"
echo "════════════════════════════════════════════════════════"

[[ "$FAIL" -gt 0 ]] && exit 1
exit 0
