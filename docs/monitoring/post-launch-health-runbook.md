# PreSkool ERP — Post-Launch Health Monitoring Runbook

> **Audience:** On-Call Engineer, Engineering Lead, DevOps  
> **Purpose:** Structured health review cadence post-launch

---

## Overview

| Cadence | Time Required | Owner | Tools |
|---------|--------------|-------|-------|
| **Daily** (automated) | 5 min | On-Call | `scripts/health-check.sh` + Grafana |
| **Weekly** (manual) | 30 min | Engineer | Grafana, psql, Loki |
| **Monthly** (formal) | 2 hours | Eng Lead | All tools + SLA report |

---

## Daily Health Check (5 minutes)

Run every morning at 09:00 IST (ideally via cron):

```bash
# Run automated check
bash scripts/health-check.sh

# Review report
cat docs/monitoring/reports/health-report-$(date +%Y%m%d)*.md
```

### Cron Setup
```bash
# Add to crontab (runs daily at 08:50 IST = 03:20 UTC)
20 3 * * * cd /app && bash scripts/health-check.sh >> /var/log/preskool-health.log 2>&1
```

### Daily Grafana Quick-Check (2 min)

Open `https://grafana.preskool.com/d/preskool-slo` and verify:

| Panel | Healthy Value | Action if Unhealthy |
|-------|--------------|---------------------|
| Availability (30d) | ≥ 99.9% | Check error logs |
| Error rate (24h) | < 0.1% | Check Loki for 5xx |
| P95 latency (1h) | < 500ms | Check slow queries |
| Active alerts | 0 Critical | Follow runbook |
| Error budget remaining | > 50% | Reduce deploy frequency |

### Daily Checklist

```
□ health-check.sh ran clean (no ❌ FAIL)
□ Grafana SLO dashboard: availability ≥ 99.9%
□ No unresolved Critical alerts in Alertmanager
□ Latest backup < 25h old
□ No CrashLooping pods in K8s
```

---

## Weekly Health Review (30 minutes)

Perform every Monday morning before standup:

### 1. Slow Query Analysis (5 min)

```sql
-- Top 10 slowest queries this week (requires pg_stat_statements extension)
SELECT
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  calls,
  round(rows / calls::numeric, 1) AS avg_rows,
  left(query, 120) AS query_snippet
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

For each query > 200ms avg:
1. Run `EXPLAIN (ANALYZE, BUFFERS)` in staging
2. Check for missing indexes (`seq_scan` high in `pg_stat_user_tables`)
3. Add index via `CREATE INDEX CONCURRENTLY` in next maintenance window

### 2. Error Log Review (5 min)

```bash
# Check Loki for ERROR/CRITICAL log lines in last 7 days
# In Grafana Explore (Loki datasource):
{job="preskool-backend"} |= "ERROR" | json | line_format "{{.timestamp}} {{.message}}"
```

Look for:
- Repeated errors (same message appearing >10x) → investigate root cause
- New error patterns not seen before → create bug ticket
- Unhandled exceptions → add proper error handling

### 3. Cache Hit Rate (2 min)

```bash
redis-cli info stats | grep -E 'keyspace_(hits|misses)'
# Target: hit rate > 70%
# If low: review cache TTLs, check for cache stampedes
```

### 4. Disk Growth Trend (3 min)

```bash
# DB size trend
psql -c "SELECT pg_size_pretty(pg_database_size('preskool_db'));"

# Log directory size
du -sh /var/log/preskool/ 2>/dev/null || ls -la /app/logs/ 2>/dev/null || true

# Docker volume size
docker system df 2>/dev/null || true
```

Alert if DB grows > 10GB/week — plan RDS upgrade.

### 5. Dependency Security Audit (5 min)

```bash
# Backend
cd backend && pip-audit --requirement requirements.txt --format=table | head -20

# Frontend
cd frontend && npm audit --audit-level=moderate
```

### 6. Alert Quality Review (5 min)

Review PagerDuty/Alertmanager for the past week:
- Any **false positives**? → Increase `for:` duration on that rule
- Any **alerts that should have fired but didn't**? → Lower threshold
- **Alert fatigue**? → Move to lower severity or add inhibition rule

### Weekly Report Template

```markdown
## Weekly Health Report — Week of <DATE>

### Metrics
- Availability: ___%  (target: 99.9%)
- Error rate: ___% (target: <0.1%)
- P95 latency: ___ms (target: <500ms)
- Backup: ✅/❌

### Issues Found This Week
1. 

### Action Items
- [ ] Item | Owner: | Due:

### Alerts Fired
| Alert | Count | False Positive? | Action Taken |
|-------|-------|----------------|--------------|
|       |       |                |              |
```

---

## Monthly Health Review (2 hours)

### 1. SLA Report Generation (30 min)

```bash
# Query Prometheus for 30-day availability
curl -s 'http://prometheus:9090/api/v1/query_range' \
  --data-urlencode 'query=avg_over_time(up{job="preskool-backend"}[30d])' \
  --data-urlencode 'start=2026-02-01T00:00:00Z' \
  --data-urlencode 'end=2026-02-28T23:59:59Z' \
  --data-urlencode 'step=3600' \
  | python3 -m json.tool
```

Generate the formal monthly SLA report (share with stakeholders):

| SLA Metric | Target | Actual | Status |
|-----------|--------|--------|--------|
| Availability | 99.9% | | |
| P95 Latency | < 500ms | | |
| P99 Latency | < 2s | | |
| Error Rate | < 0.1% | | |
| Total Incidents | 0 P0, <2 P1 | | |

### 2. Capacity Planning (30 min)

```bash
# DB growth rate
psql -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 15;"
```

Project 6-month disk, memory, CPU needs. Raise RDS/K8s upgrade tickets if needed.

### 3. Security Review (30 min)

- Run full `bash security/scripts/frontend-audit.sh`
- Run `bash security/scripts/scan.sh`
- Review CVE advisories for FastAPI, PostgreSQL, Redis
- Review access logs for anomalies

### 4. Performance Benchmark (30 min)

```bash
bash scripts/perf-analysis.sh
```

Compare results to previous month. Any regressions need JIRA tickets.

### 5. Documentation Review (15 min)

- Update `docs/oncall/on-call-schedule.md` for next month
- Review and close any open postmortem action items
- Update runbooks if new failure patterns discovered
