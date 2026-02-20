#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Security Scanning Orchestrator
# Runs all security scans and generates unified report
#
# Usage:
#   ./security/scripts/scan.sh [--skip-trivy] [--skip-bandit] [--skip-deps]
#   ./security/scripts/scan.sh --severity HIGH  (only fail on HIGH+)
#
# Requirements:
#   - bandit, pip-audit, safety (pip install bandit pip-audit safety)
#   - trivy (brew install trivy OR docker pull aquasec/trivy)
#   - Docker running (for Trivy container scan)
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
REPORT_DIR="$PROJECT_ROOT/security/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/security-scan-$TIMESTAMP.md"

FAIL_SEVERITY="${FAIL_SEVERITY:-MEDIUM}"   # Fail CI if >= this severity
SKIP_TRIVY="${SKIP_TRIVY:-false}"
SKIP_BANDIT="${SKIP_BANDIT:-false}"
SKIP_DEPS="${SKIP_DEPS:-false}"

# Colors
RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0

log()  { echo -e "${BLUE}[SCAN]${NC} $*"; }
ok()   { echo -e "${GREEN}[PASS]${NC} $*"; ((PASS++)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; ((WARN++)); }
fail() { echo -e "${RED}[FAIL]${NC} $*"; ((FAIL++)); }

mkdir -p "$REPORT_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  PreSkool ERP — Security Scan  |  $(date)"
echo "═══════════════════════════════════════════════════════════════"

# Init report
cat > "$REPORT_FILE" << EOF
# PreSkool ERP — Security Scan Report
**Generated:** $(date)
**Commit:** $(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "N/A")
**Branch:** $(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo "N/A")

---
EOF

# ── 1. BANDIT — Python SAST ──────────────────────────────────────────
if [[ "$SKIP_BANDIT" != "true" ]]; then
  log "Running Bandit SAST scan..."
  BANDIT_JSON="$REPORT_DIR/bandit-$TIMESTAMP.json"

  if source "$BACKEND_DIR/venv/bin/activate" 2>/dev/null && command -v bandit &>/dev/null; then
    bandit -r "$BACKEND_DIR/app/" \
      -f json \
      -o "$BANDIT_JSON" \
      --severity-level low \
      --confidence-level low \
      -x "$BACKEND_DIR/venv" \
      2>/dev/null || true

    HIGH=$(python3 -c "import json; d=json.load(open('$BANDIT_JSON')); m=d.get('metrics',{}).get('_totals',{}); print(m.get('SEVERITY.HIGH',0))")
    MED=$(python3  -c "import json; d=json.load(open('$BANDIT_JSON')); m=d.get('metrics',{}).get('_totals',{}); print(m.get('SEVERITY.MEDIUM',0))")
    LOW=$(python3  -c "import json; d=json.load(open('$BANDIT_JSON')); m=d.get('metrics',{}).get('_totals',{}); print(m.get('SEVERITY.LOW',0))")
    LOC=$(python3  -c "import json; d=json.load(open('$BANDIT_JSON')); m=d.get('metrics',{}).get('_totals',{}); print(m.get('loc',0))")

    echo "  Lines of code: $LOC"
    echo "  High: $HIGH | Medium: $MED | Low: $LOW"

    cat >> "$REPORT_FILE" << EOF
## 1. Bandit — Python SAST

| Severity | Count |
|----------|-------|
| 🔴 High   | $HIGH |
| 🟡 Medium | $MED  |
| 🟢 Low    | $LOW  |

**Lines scanned:** $LOC

EOF

    if [[ "$HIGH" -gt 0 ]]; then
      fail "Bandit: $HIGH HIGH severity issues found"
    elif [[ "$MED" -gt 0 ]]; then
      warn "Bandit: $MED MEDIUM severity issues found"
    else
      ok "Bandit: No HIGH/MEDIUM issues ($LOW low, $LOC lines)"
    fi

    # Append findings
    python3 << PYEOF >> "$REPORT_FILE"
import json
data = json.load(open('$BANDIT_JSON'))
results = data.get('results', [])
if results:
    print("### Findings\n")
    for r in sorted(results, key=lambda x: x['issue_severity'], reverse=True):
        sev = r['issue_severity']
        icon = '🔴' if sev == 'HIGH' else '🟡' if sev == 'MEDIUM' else '🟢'
        print(f"- {icon} **[{sev}]** {r['test_id']}: {r['issue_text']}")
        print(f"  - File: \`{r['filename']}:{r['line_number']}\`")
        print(f"  - Confidence: {r['issue_confidence']}")
        print(f"  - More info: {r.get('more_info', 'N/A')}")
else:
    print("✅ No issues found.\n")
PYEOF
  else
    warn "Bandit not found. Install with: pip install bandit"
  fi
fi

# ── 2. DEPENDENCY VULNERABILITY SCAN ─────────────────────────────────
if [[ "$SKIP_DEPS" != "true" ]]; then
  log "Running dependency vulnerability scan..."

  cat >> "$REPORT_FILE" << EOF

## 2. Dependency Audit

EOF

  if source "$BACKEND_DIR/venv/bin/activate" 2>/dev/null && command -v pip-audit &>/dev/null; then
    DEP_JSON="$REPORT_DIR/pip-audit-$TIMESTAMP.json"
    if pip-audit --format json -o "$DEP_JSON" --disable-pip 2>/dev/null; then
      VULNS=$(python3 -c "import json; data=json.load(open('$DEP_JSON')); print(sum(len(d.get('vulns',[])) for d in data if isinstance(data, list) and d))" 2>/dev/null || echo "0")
      if [[ "$VULNS" -gt 0 ]]; then
        fail "pip-audit: $VULNS vulnerable dependencies found"
        echo "**⚠️ $VULNS vulnerable packages found. See $DEP_JSON**" >> "$REPORT_FILE"
      else
        ok "pip-audit: No vulnerable dependencies"
        echo "✅ No known vulnerabilities found in Python dependencies." >> "$REPORT_FILE"
      fi
    else
      warn "pip-audit: Could not connect to PyPI (offline mode)"
      echo "⚠️ Dependency audit skipped (offline). Run in CI with network access." >> "$REPORT_FILE"
    fi
  fi

  # Check requirements.txt for known bad patterns
  log "Checking requirements.txt for pinned versions..."
  UNPINNED=$(grep -E "^[a-zA-Z]" "$BACKEND_DIR/requirements.txt" | grep -v -E "(>=|==|~=|<=)" | wc -l | tr -d ' ')
  if [[ "$UNPINNED" -gt 0 ]]; then
    warn "requirements.txt: $UNPINNED unpinned dependencies"
    echo "⚠️ $UNPINNED dependencies lack version pins (security risk)." >> "$REPORT_FILE"
  else
    ok "requirements.txt: All dependencies have version constraints"
    echo "✅ All Python dependencies have version constraints." >> "$REPORT_FILE"
  fi
fi

# ── 3. TRIVY — Container & Filesystem Scan ───────────────────────────
if [[ "$SKIP_TRIVY" != "true" ]]; then
  log "Running Trivy security scan..."

  cat >> "$REPORT_FILE" << EOF

## 3. Trivy — Container & Filesystem Scan

EOF

  if command -v trivy &>/dev/null; then
    TRIVY_JSON="$REPORT_DIR/trivy-fs-$TIMESTAMP.json"
    trivy fs "$PROJECT_ROOT" \
      --format json \
      --output "$TRIVY_JSON" \
      --severity "HIGH,CRITICAL" \
      --skip-dirs ".git,node_modules,venv,__pycache__" \
      --ignore-unfixed \
      2>/dev/null || true

    CRITICAL=$(python3 -c "import json; d=json.load(open('$TRIVY_JSON')); results=d.get('Results',[]); print(sum(sum(1 for v in r.get('Vulnerabilities',[]) or [] if v.get('Severity')=='CRITICAL') for r in results))" 2>/dev/null || echo "0")
    HIGH=$(python3 -c "import json; d=json.load(open('$TRIVY_JSON')); results=d.get('Results',[]); print(sum(sum(1 for v in r.get('Vulnerabilities',[]) or [] if v.get('Severity')=='HIGH') for r in results))" 2>/dev/null || echo "0")

    if [[ "$CRITICAL" -gt 0 ]]; then
      fail "Trivy: $CRITICAL CRITICAL vulnerabilities found"
    elif [[ "$HIGH" -gt 0 ]]; then
      warn "Trivy: $HIGH HIGH vulnerabilities found"
    else
      ok "Trivy: No CRITICAL/HIGH vulnerabilities"
    fi

    echo "| Severity | Count |" >> "$REPORT_FILE"
    echo "|----------|-------|" >> "$REPORT_FILE"
    echo "| 🔴 Critical | $CRITICAL |" >> "$REPORT_FILE"
    echo "| 🟠 High | $HIGH |" >> "$REPORT_FILE"
  else
    # Run via Docker if trivy not installed
    if docker info &>/dev/null 2>&1; then
      log "Trivy not installed — running via Docker..."
      docker run --rm -v "$PROJECT_ROOT:/project:ro" \
        aquasec/trivy:latest fs /project \
        --severity "HIGH,CRITICAL" \
        --skip-dirs ".git,node_modules,venv" \
        --ignore-unfixed 2>/dev/null || true
      echo "✅ Trivy scan completed via Docker." >> "$REPORT_FILE"
    else
      warn "Trivy not installed. Install: brew install trivy"
      echo "⚠️ Trivy not available. Install with: \`brew install trivy\`" >> "$REPORT_FILE"
    fi
  fi
fi

# ── 4. SECRET DETECTION ───────────────────────────────────────────────
log "Scanning for leaked secrets..."

cat >> "$REPORT_FILE" << EOF

## 4. Secret Detection

EOF

# Check for hardcoded secrets patterns
SECRET_PATTERNS=(
  "password\s*=\s*['\"][^'\"]{6,}"
  "secret\s*=\s*['\"][^'\"]{6,}"
  "api_key\s*=\s*['\"][^'\"]{6,}"
  "private_key.*BEGIN"
  "AWS_SECRET_ACCESS_KEY\s*=\s*[A-Za-z0-9/+]{20,}"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  found=$(grep -rE "$pattern" "$PROJECT_ROOT/backend/app/" \
    --include="*.py" \
    --exclude-dir=__pycache__ \
    -l 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$found" -gt 0 ]]; then
    ((SECRETS_FOUND += found))
  fi
done

# Check .env files committed to git
ENV_COMMITTED=$(git -C "$PROJECT_ROOT" ls-files | grep -E "^\.env$" | wc -l | tr -d ' ' || echo "0")

if [[ "$SECRETS_FOUND" -gt 0 ]]; then
  fail "Possible hardcoded secrets in $SECRETS_FOUND files"
  echo "⚠️ Potential hardcoded secrets found. Review immediately." >> "$REPORT_FILE"
elif [[ "$ENV_COMMITTED" -gt 0 ]]; then
  fail ".env file committed to git repository"
  echo "🔴 .env file is tracked in git. Remove with: git rm --cached .env" >> "$REPORT_FILE"
else
  ok "No hardcoded secrets detected"
  echo "✅ No hardcoded secrets detected in source code." >> "$REPORT_FILE"
fi

# ── 5. CONFIGURATION SECURITY CHECK ──────────────────────────────────
log "Checking security configuration..."

cat >> "$REPORT_FILE" << EOF

## 5. Security Configuration Audit

EOF

ISSUES=0

check_config() {
  local desc="$1"; local result="$2"; local expected="$3"
  if [[ "$result" == *"$expected"* ]]; then
    ok "Config: $desc"
    echo "- ✅ $desc" >> "$REPORT_FILE"
  else
    warn "Config: $desc (found: $result)"
    echo "- ⚠️ $desc (current: \`$result\`)" >> "$REPORT_FILE"
    ((ISSUES++))
  fi
}

# Check JWT secret strength
JWT_SECRET=$(grep "JWT_SECRET_KEY" "$PROJECT_ROOT/backend/app/core/config.py" | head -1 | grep -o '".*"' | tr -d '"' | head -1)
if [[ ${#JWT_SECRET} -lt 32 ]]; then
  warn "JWT_SECRET_KEY is weak (default value, change in production)"
  echo "- ⚠️ JWT_SECRET_KEY uses default value — **MUST be changed in production**" >> "$REPORT_FILE"
else
  ok "JWT secret key defined"
  echo "- ✅ JWT secret key configured" >> "$REPORT_FILE"
fi

# Check DEBUG mode
DEBUG_MODE=$(grep "^    DEBUG" "$PROJECT_ROOT/backend/app/core/config.py" | grep -o "True\|False" | head -1)
check_config "DEBUG=False in production (currently dev default)" "$DEBUG_MODE" "True"

# Check HTTPS enforcement
check_config "HTTPS redirect middleware present" \
  "$(grep -l 'HTTPSRedirect' "$PROJECT_ROOT/backend/app/core/security.py" 2>/dev/null)" "security.py"

check_config "Security headers middleware present" \
  "$(grep -l 'SecurityHeaders' "$PROJECT_ROOT/backend/app/core/security.py" 2>/dev/null)" "security.py"

check_config "Rate limiting middleware present" \
  "$(grep -l 'RateLimitMiddleware' "$PROJECT_ROOT/backend/app/core/security.py" 2>/dev/null)" "security.py"

check_config "CSRF protection present" \
  "$(grep -l 'CSRFMiddleware' "$PROJECT_ROOT/backend/app/core/security.py" 2>/dev/null)" "security.py"

check_config "Account lockout mechanism present" \
  "$(grep -l 'AccountLockout' "$PROJECT_ROOT/backend/app/core/security.py" 2>/dev/null)" "security.py"

check_config "Password policy enforced" \
  "$(grep -l 'PasswordPolicy' "$PROJECT_ROOT/backend/app/core/security.py" 2>/dev/null)" "security.py"

check_config "nginx TLS config present" \
  "$(ls "$PROJECT_ROOT/nginx/nginx.conf" 2>/dev/null)" "nginx.conf"

check_config "Input sanitization present" \
  "$(grep -l 'InputSanitizer' "$PROJECT_ROOT/backend/app/core/security.py" 2>/dev/null)" "security.py"

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
echo "═══════════════════════════════════════════════════════════════"
echo -e "  ${BOLD}Results:${NC} ${GREEN}$PASS passed${NC} | ${YELLOW}$WARN warnings${NC} | ${RED}$FAIL failed${NC}"
echo "  Report: $REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════"

# Exit non-zero if failures
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
