#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Feedback Analyzer
#
# Pulls from /api/v1/feedback, aggregates by type/module/rating,
# surfaces top issues, and writes a Markdown summary report.
#
# Usage:
#   bash scripts/analyze-feedback.sh
#   BASE_URL=https://erp.preskool.com ADMIN_TOKEN=xyz bash scripts/analyze-feedback.sh
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
REPORT_DIR="docs/product/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT="$REPORT_DIR/feedback-analysis-$TIMESTAMP.md"
mkdir -p "$REPORT_DIR"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'
BOLD='\033[1m'; NC='\033[0m'

section() { echo -e "\n${BOLD}── $* ──────────────────────────────────────${NC}"; }
ok()      { echo -e "  ${GREEN}✓${NC} $*"; }
info()    { echo -e "  ${BLUE}→${NC} $*"; }

AUTH_HEADER=""
[[ -n "$ADMIN_TOKEN" ]] && AUTH_HEADER="Authorization: Bearer $ADMIN_TOKEN"

api_get() {
  local path="$1"
  if [[ -n "$AUTH_HEADER" ]]; then
    curl -s --max-time 15 -H "$AUTH_HEADER" "$BASE_URL$path" 2>/dev/null
  else
    curl -s --max-time 15 "$BASE_URL$path" 2>/dev/null
  fi
}

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  PreSkool ERP — Feedback Analysis                ║"
echo "║  $(date)           ║"
echo "╚══════════════════════════════════════════════════╝"

# ── Fetch data ────────────────────────────────────────────────────────
section "Fetching feedback data"

STATS=$(api_get "/api/v1/feedback/stats" || echo "{}")
ITEMS=$(api_get "/api/v1/feedback/?page_size=100" || echo '{"items":[],"total":0}')

TOTAL=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total',0))" 2>/dev/null || echo "0")
ok "Total feedback items: $TOTAL"

if [[ "$TOTAL" == "0" ]]; then
  echo -e "  ${YELLOW}No feedback collected yet.${NC} Encourage users to use the feedback widget."
  echo "# Feedback Analysis — No Data Yet" > "$REPORT"
  echo "Generated: $(date)" >> "$REPORT"
  echo "No feedback has been submitted yet." >> "$REPORT"
  echo "Report: $REPORT"
  exit 0
fi

# ── Parse stats via Python ────────────────────────────────────────────
python3 << PYEOF
import json, sys, os
from datetime import datetime
from collections import Counter

stats_raw = """$STATS"""
items_raw = """$ITEMS"""

try:
    stats = json.loads(stats_raw)
    items_data = json.loads(items_raw)
except Exception as e:
    print(f"Parse error: {e}")
    sys.exit(1)

items = items_data.get("items", [])
total = stats.get("total", 0)
by_type = stats.get("by_type", {})
by_module = stats.get("by_module", {})
avg_rating = stats.get("avg_rating_overall")
avg_by_module = stats.get("avg_rating_by_module", {})
report_path = "$REPORT"

# ── Console summary ───────────────────────────────────────────────────────
print()
print(f"  Type breakdown: {by_type}")
print(f"  Top modules: {dict(list(by_module.items())[:5])}")
print(f"  Avg rating: {avg_rating}")
print()

# ── Markdown report ───────────────────────────────────────────────────────
lines = []
lines.append(f"# PreSkool ERP — Feedback Analysis Report")
lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
lines.append(f"**Total submissions:** {total}")
lines.append("")

# ── Type breakdown
lines.append("## Feedback by Type")
lines.append("")
lines.append("| Type | Count | % |")
lines.append("|------|-------|---|")
for t, count in sorted(by_type.items(), key=lambda x: -x[1]):
    pct = round(count * 100 / total) if total else 0
    lines.append(f"| {t.capitalize()} | {count} | {pct}% |")
lines.append("")

# ── Module breakdown
if by_module:
    lines.append("## Most Reported Modules")
    lines.append("")
    lines.append("| Module | Reports | Avg Rating |")
    lines.append("|--------|---------|-----------|")
    for mod, count in list(by_module.items())[:10]:
        avg = avg_by_module.get(mod, "—")
        avg_str = f"{'⭐' * round(float(avg)) if avg != '—' else '—'} ({avg})" if avg != "—" else "—"
        lines.append(f"| `{mod}` | {count} | {avg_str} |")
    lines.append("")

# ── Rating summary
if avg_rating:
    lines.append("## Satisfaction Rating")
    lines.append("")
    stars = "⭐" * round(float(avg_rating))
    lines.append(f"**Overall average:** {stars} **{avg_rating}/5**")
    lines.append("")
    lines.append("| Module | Avg Rating |")
    lines.append("|--------|-----------|")
    for mod, avg in sorted(avg_by_module.items(), key=lambda x: x[1]):
        bar = "⭐" * round(float(avg))
        lines.append(f"| \`{mod}\` | {bar} {avg} |")
    lines.append("")

# ── Top bugs (low-rated bug reports)
bugs = [i for i in items if i.get("type") == "bug"]
if bugs:
    bugs_low = sorted(bugs, key=lambda x: x.get("rating") or 5)[:5]
    lines.append("## Top Bug Reports (Highest Priority)")
    lines.append("")
    lines.append("| Module | Rating | Message |")
    lines.append("|--------|--------|---------|")
    for b in bugs_low:
        msg = b.get("message", "")[:100]
        rating = b.get("rating", "—")
        module = b.get("module", "—")
        lines.append(f"| `{module}` | {'⭐' * int(rating) if isinstance(rating, int) else '—'} | {msg} |")
    lines.append("")

# ── Top feature requests
features = [i for i in items if i.get("type") == "feature"]
if features:
    lines.append("## Top Feature Requests")
    lines.append("")
    # Group by module
    feat_by_module = Counter(f.get("module", "general") for f in features)
    lines.append("| Module | Requests |")
    lines.append("|--------|---------|")
    for mod, cnt in feat_by_module.most_common(10):
        lines.append(f"| `{mod}` | {cnt} |")
    lines.append("")
    lines.append("### Feature Request Messages")
    lines.append("")
    for f in features[:10]:
        msg = f.get("message", "")[:150]
        mod = f.get("module", "—")
        lines.append(f"- **[{mod}]** {msg}")
    lines.append("")

# ── Recommendations
lines.append("## Recommended Actions")
lines.append("")
bug_count = by_type.get("bug", 0)
feat_count = by_type.get("feature", 0)
praise_count = by_type.get("praise", 0)

if bug_count > feat_count:
    lines.append("1. 🔴 **Bug fix sprint recommended** — more bugs than feature requests")
else:
    lines.append("1. 🟢 **Feature sprint ready** — low bug-to-feature ratio")

if avg_rating and float(avg_rating) < 3.5:
    lines.append("2. 🔴 **Satisfaction below threshold** — prioritize UX improvements")
elif avg_rating and float(avg_rating) >= 4.0:
    lines.append("2. 🟢 **High satisfaction** — good signal to add features")

if by_module:
    top_module = list(by_module.keys())[0]
    lines.append(f"3. 📌 **Focus on `{top_module}` module** — highest feedback volume")

lines.append("")
lines.append("---")
lines.append(f"*Run again: `bash scripts/analyze-feedback.sh`*")

with open(report_path, "w") as f:
    f.write("\n".join(lines))

print(f"  ✓ Report written to: {report_path}")
PYEOF

section "Report Summary"
ok "Report saved: $REPORT"
info "View: cat $REPORT"
info "Open: open $REPORT"
echo ""
