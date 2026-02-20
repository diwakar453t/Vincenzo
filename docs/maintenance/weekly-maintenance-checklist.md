# PreSkool ERP — Weekly Maintenance Checklist

> **Cadence:** Every Monday before standup  
> **Owner:** On-Call Engineer (rotating)  
> **Estimated time:** 30–45 minutes

---

## Week of: _______________  |  Engineer: _______________

---

### 1. System Health (10 min)

```bash
bash scripts/health-check.sh
```

- [ ] health-check.sh ran with no ❌ FAIL
- [ ] Grafana SLO — availability ≥ 99.9% this week
- [ ] No unacknowledged alerts in Alertmanager
- [ ] All K8s pods `Running` in the `preskool` namespace
- [ ] Docker image registry — no orphaned old images accumulating

---

### 2. Backup Verification (5 min)

```bash
bash backend/scripts/restore-test.sh
```

- [ ] Latest backup is < 25 hours old
- [ ] Restore test passed (all 15 core tables present)
- [ ] S3/remote backup location accessible

---

### 3. Security & Dependency Audit (10 min)

```bash
# Backend
cd backend && pip-audit --requirement requirements.txt --format=table 2>/dev/null | head -30

# Frontend
cd frontend && npm audit --audit-level=moderate
```

- [ ] No CRITICAL or HIGH vulnerabilities in backend deps
- [ ] No CRITICAL or HIGH vulnerabilities in frontend deps
- [ ] If vulnerabilities found: create JIRA ticket (P1 for critical, P2 for high)
- [ ] Check: https://github.com/advisories for FastAPI, PostgreSQL, Redis

---

### 4. Performance Check (5 min)

```bash
SKIP_PROMETHEUS=false bash scripts/perf-analysis.sh
```

- [ ] No endpoint with P95 > 1000ms
- [ ] Redis cache hit rate ≥ 70%
- [ ] No new JS bundle chunks > 500KB
- [ ] DB slow queries — none averaging > 500ms

---

### 5. Log Review (5 min)

In Grafana → Explore (Loki datasource):
```
{job="preskool-backend"} |= "ERROR" | json
```

- [ ] No new repeated error patterns (same error > 10 occurrences)
- [ ] No unhandled exceptions that don't have JIRA tickets
- [ ] No data-related errors (integrity constraint violations, etc.)

---

### 6. Certificate & DNS Review (2 min)

```bash
DOMAIN=erp.preskool.com
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null \
  | openssl x509 -noout -enddate
```

- [ ] TLS certificate expires in > 30 days
- [ ] DNS resolves correctly for all subdomains (erp, api, grafana, status)

---

### 7. Disk & Storage Trend (3 min)

```bash
psql -c "SELECT pg_size_pretty(pg_database_size('preskool_db'));"
df -h /
docker system df 2>/dev/null || true
```

- [ ] DB not growing more than 5GB/week (if so: capacity review needed)
- [ ] Host disk < 80% used
- [ ] Docker volumes < 50GB total

---

### 8. Open Incidents & Tickets (5 min)

- [ ] All P0/P1 incidents from the past week have post-mortems filed
- [ ] All post-mortem action items have owners and due dates set in JIRA
- [ ] Previous week's maintenance action items resolved or re-scheduled

---

### Notes this week:

```

```

### Action Items from this Check:

| Issue | Priority | JIRA ticket | Owner | Due |
|-------|----------|-------------|-------|-----|
| | | | | |

---

**Completed by:** ___________________   
**Date/Time:** ___________________
