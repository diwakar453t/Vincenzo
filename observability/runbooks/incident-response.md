# PreSkool ERP — Incident Response Runbooks

> **On-Call Engineer Guide** for handling production alerts.
> Each runbook maps to a specific Prometheus alert rule.

---

## 📋 Table of Contents

| Alert | Severity | Runbook |
|-------|----------|---------|
| AppDown | 🔴 Critical | [App Down](#app-down) |
| HighErrorRate | 🔴 Critical | [High Error Rate](#high-error-rate) |
| HighLatency | 🟡 Warning | [High Latency](#high-latency) |
| PostgresDown | 🔴 Critical | [PostgreSQL Down](#postgresql-down) |
| DatabaseConnectionPoolExhausted | 🟡 Warning | [DB Pool Exhaustion](#db-pool-exhaustion) |
| SlowQueries | 🟡 Warning | [Slow Queries](#slow-queries) |
| RedisDown | 🔴 Critical | [Redis Down](#redis-down) |
| RedisHighMemory | 🟡 Warning | [Redis Memory](#redis-high-memory) |
| DiskSpaceCritical | 🔴 Critical | [Disk Space](#disk-space-critical) |
| HighCPUUsage | 🟡 Warning | [High CPU](#high-cpu-usage) |
| AuthBruteForce | 🔴 Critical | [Brute Force Attack](#brute-force-attack) |
| SLABreachRisk | 🔴 Critical | [SLA Breach](#sla-breach-risk) |
| CeleryWorkerDown | 🔴 Critical | [Celery Down](#celery-worker-down) |
| ContainerOOMKilled | 🔴 Critical | [OOM Killed](#container-oom-killed) |

---

## 🔴 App Down

**Alert:** `AppDown` — Backend unreachable for >1 minute

### Impact
- ALL 200+ colleges cannot access the ERP
- Student/teacher/parent portals completely down
- Fee payments, attendance marking, grade entry — all blocked

### Immediate Actions (< 5 min)

```bash
# 1. Check container status
docker ps -a | grep preskool-backend

# 2. Check backend logs for crash reason
docker logs preskool-backend --tail 100

# 3. Restart the container
docker compose restart backend

# 4. If container keeps crashing, check resource limits
docker stats preskool-backend

# 5. Verify recovery
curl -s http://localhost:8000/api/v1/health | python3 -m json.tool
```

### Investigation
1. Check Grafana: http://localhost:3200/grafana/d/preskool-metrics
2. Check Jaeger traces: http://localhost:16686 (last requests before crash)
3. Check if PostgreSQL/Redis dependency is down (cascading failure)
4. Review recent deployments — was there a code change?

### Kubernetes (Production)
```bash
kubectl get pods -n preskool -l app=backend
kubectl describe pod <pod-name> -n preskool
kubectl logs <pod-name> -n preskool --tail 200
kubectl rollout restart deployment/preskool-backend -n preskool
```

### Escalation
- If not resolved in 10 min → Page CTO
- If data integrity concern → Page Database team

---

## 🔴 High Error Rate

**Alert:** `HighErrorRate` — >5% of requests returning 5xx errors

### Immediate Actions

```bash
# 1. Check which endpoints are failing
docker logs preskool-backend --tail 200 | grep -i error

# 2. Check error distribution in Grafana
# Open: http://localhost:3200/grafana/d/preskool-metrics
# Panel: "HTTP Status Code Distribution"

# 3. Check if specific tenant is affected
docker logs preskool-backend --tail 500 | grep -E '"status_code": 5' | jq '.tenant_id' | sort | uniq -c | sort -rn

# 4. Check database connectivity
docker exec preskool-backend python3 -c "
from app.core.database import engine
with engine.connect() as conn:
    result = conn.execute('SELECT 1')
    print('DB OK:', result.fetchone())
"
```

### Common Causes
| Cause | Fix |
|-------|-----|
| Database connection pool exhausted | Restart backend, increase pool size |
| Redis unavailable | Check Redis container, restart |
| Disk full | Clean up logs, increase disk |
| Memory pressure | Increase container memory limits |
| Bad deployment | Rollback: `kubectl rollout undo deployment/preskool-backend` |

---

## 🟡 High Latency

**Alert:** `HighLatencyP95` — P95 response time >2 seconds

### Immediate Actions

```bash
# 1. Find slowest endpoints in Jaeger
# Open: http://localhost:16686
# Service: preskool-backend, Sort by: Duration DESC

# 2. Check DB query times
docker logs preskool-backend | grep -E '"duration_ms": [0-9]{4,}'

# 3. Check DB connection pool status
docker exec preskool-db psql -U preskool -c "SELECT count(*) FROM pg_stat_activity;"

# 4. Check if Redis is responding slowly
docker exec preskool-redis redis-cli info stats | grep instantaneous
```

### Common Causes
- Missing database indexes → Run `EXPLAIN ANALYZE` on slow queries
- N+1 query patterns → Check Jaeger trace span count
- Redis cache misses → Check cache hit rate dashboard
- High DB connection wait time → Increase pool or use PgBouncer

---

## 🔴 PostgreSQL Down

**Alert:** `PostgresDown` — PostgreSQL unreachable

### Impact
- ALL CRUD operations fail across all modules
- Data writes impossible — attendance, fees, grades
- Backend will return 500s on every DB operation

### Immediate Actions

```bash
# 1. Check PostgreSQL container
docker ps -a | grep preskool-db
docker logs preskool-db --tail 50

# 2. Check disk space (most common cause)
docker exec preskool-db df -h /var/lib/postgresql/data

# 3. Restart PostgreSQL
docker compose restart postgres

# 4. Verify
docker exec preskool-db pg_isready -U preskool

# 5. Check for data corruption
docker exec preskool-db psql -U preskool -c "SELECT datname, pg_database_size(datname) FROM pg_database;"
```

### AWS RDS (Production)
```bash
aws rds describe-db-instances --db-instance-identifier preskool-production
aws rds reboot-db-instance --db-instance-identifier preskool-production
```

### Escalation
- If data corruption suspected → IMMEDIATELY page Database Lead
- If disk full → Increase storage (RDS auto-scaling should handle)

---

## 🟡 DB Pool Exhaustion

**Alert:** `DatabaseConnectionPoolExhausted` — Pool >85% utilized

### Immediate Actions

```bash
# 1. Check active connections
docker exec preskool-db psql -U preskool -c "
SELECT count(*), state FROM pg_stat_activity
GROUP BY state ORDER BY count DESC;"

# 2. Kill idle connections
docker exec preskool-db psql -U preskool -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < now() - interval '10 minutes';"

# 3. Monitor pool in Grafana
# Panel: "DB Connection Pool" gauge
```

### Long-term Fixes
- Enable PgBouncer (USE_PGBOUNCER=true in production)
- Increase DB_POOL_SIZE (currently 50)
- Optimize long-running queries
- Add connection timeouts to application code

---

## 🟡 Slow Queries

**Alert:** `SlowQueries` — P95 query time >500ms

### Investigation

```bash
# 1. Find slow queries in PostgreSQL logs
docker logs preskool-db 2>&1 | grep "duration:" | sort -t: -k2 -rn | head

# 2. Check for missing indexes
docker exec preskool-db psql -U preskool -c "
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND idx_scan < 100
ORDER BY seq_scan DESC LIMIT 10;"

# 3. Analyze specific slow query
docker exec preskool-db psql -U preskool -c "
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM students WHERE tenant_id = 'college1' ORDER BY created_at DESC LIMIT 50;"
```

### Fixes
- Add index: `CREATE INDEX CONCURRENTLY idx_<table>_tenant ON <table>(tenant_id, created_at);`
- Optimize N+1 queries with JOINs or eager loading
- Add Redis caching for frequently accessed data

---

## 🔴 Redis Down

**Alert:** `RedisDown` — Redis unreachable

### Impact
- Tenant validation cache → every request hits DB
- Session storage lost → users logged out
- Celery broker down → background tasks halt
- Rate limiting disabled

### Immediate Actions

```bash
# 1. Check container
docker ps -a | grep preskool-redis
docker logs preskool-redis --tail 30

# 2. Restart Redis
docker compose restart redis

# 3. Verify
docker exec preskool-redis redis-cli ping

# 4. Check memory
docker exec preskool-redis redis-cli info memory
```

---

## 🟡 Redis High Memory

**Alert:** `RedisHighMemory` — Memory usage >85%

### Immediate Actions

```bash
# 1. Check what's using memory
docker exec preskool-redis redis-cli info memory
docker exec preskool-redis redis-cli dbsize

# 2. Check largest keys
docker exec preskool-redis redis-cli --bigkeys

# 3. Clear expired keys
docker exec preskool-redis redis-cli debug set-active-expire 1

# 4. Increase maxmemory (temporary)
docker exec preskool-redis redis-cli config set maxmemory 1gb
```

---

## 🔴 Disk Space Critical

**Alert:** `DiskSpaceCritical` — Disk usage >95%

### IMMEDIATE Actions

```bash
# 1. Find what's consuming space
du -sh /var/lib/docker/containers/* | sort -rh | head

# 2. Clean Docker resources
docker system prune -f
docker volume prune -f

# 3. Rotate logs
docker exec preskool-backend find /app/logs -name "*.log" -mtime +7 -delete

# 4. Truncate large container logs
truncate -s 0 /var/lib/docker/containers/<id>/<id>-json.log

# 5. Check PostgreSQL WAL files
docker exec preskool-db du -sh /var/lib/postgresql/data/pg_wal/
```

---

## 🟡 High CPU Usage

**Alert:** `HighCPUUsage` — CPU >80% for 10 minutes

### Investigation

```bash
# 1. Find CPU-heavy containers
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 2. Check for runaway queries
docker exec preskool-db psql -U preskool -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '30 seconds'
ORDER BY duration DESC;"

# 3. Check backend CPU profile
docker exec preskool-backend python3 -c "import os; os.system('top -bn1 -o %CPU | head -15')"
```

### Kubernetes
```bash
kubectl top pods -n preskool --sort-by=cpu
kubectl top nodes
# If autoscaling: check HPA status
kubectl get hpa -n preskool
```

---

## 🔴 Brute Force Attack

**Alert:** `AuthBruteForce` — >10 failed auth attempts/sec

### IMMEDIATE Actions

```bash
# 1. Find attack source IPs
docker logs preskool-backend | grep '"status_code": 401' | jq '.client_ip' | sort | uniq -c | sort -rn | head

# 2. Block source IPs (nginx)
# Add to nginx deny list or WAF rules

# 3. Check if any accounts were compromised
docker exec preskool-db psql -U preskool -c "
SELECT email, failed_login_count, last_failed_login
FROM users WHERE failed_login_count > 5
ORDER BY last_failed_login DESC LIMIT 20;"

# 4. Enable rate limiting (if not already)
# Set RATE_LIMIT_PER_MINUTE=30 for auth endpoints
```

### AWS WAF (Production)
```bash
# Add IP to WAF blocklist
aws wafv2 update-ip-set --name preskool-blocklist --scope REGIONAL \
  --addresses "x.x.x.x/32" --id <ip-set-id> --lock-token <token>
```

### Escalation
- If accounts compromised → Force password resets
- If DDoS → Engage AWS Shield / CloudFlare

---

## 🔴 SLA Breach Risk

**Alert:** `SLABreachRisk` — Availability <99.5% (target: 99.9%)

### Immediate Actions

```bash
# 1. Check current error rate
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(http_requests_total{status_code=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))' \
  | python3 -m json.tool

# 2. Check all service health
docker ps -a --format "table {{.Names}}\t{{.Status}}"

# 3. Priority: restore availability first, then investigate root cause
# Follow AppDown or HighErrorRate runbook based on symptoms
```

### SLA Targets
| Metric | Target | Monthly Budget |
|--------|--------|----------------|
| Availability | 99.9% | 43.8 min downtime |
| P95 Latency | <1s | — |
| P99 Latency | <3s | — |
| Error Rate | <0.1% | — |

---

## 🔴 Celery Worker Down

**Alert:** `CeleryWorkerDown` — No workers running

### Impact
- Background report generation stopped
- Bulk email/SMS notifications queued but not sent
- Data export tasks halted
- Scheduled cleanup jobs not running

### Immediate Actions

```bash
# 1. Check Celery container
docker ps -a | grep preskool-celery
docker logs preskool-celery --tail 50

# 2. Check Redis broker connectivity
docker exec preskool-celery python3 -c "
import redis
r = redis.from_url('redis://redis:6379/1')
print('Broker OK:', r.ping())
"

# 3. Restart Celery
docker compose restart celery-worker

# 4. Check queue backlog
docker exec preskool-celery celery -A app.celery_app inspect active
docker exec preskool-celery celery -A app.celery_app inspect reserved
```

---

## 🔴 Container OOM Killed

**Alert:** `ContainerOOMKilled` — Container killed due to memory

### Immediate Actions

```bash
# 1. Check which container was OOM killed
docker inspect --format '{{.Name}} {{.State.OOMKilled}}' $(docker ps -aq)

# 2. Check memory limits
docker stats --no-stream

# 3. Increase memory limit
# Edit docker-compose.yml → deploy.resources.limits.memory
# Restart: docker compose up -d <service>

# 4. Investigate memory leak
docker exec <container> python3 -c "
import tracemalloc
tracemalloc.start()
# ... check top allocations
"
```

---

## 📞 Escalation Matrix

| Severity | Response Time | Notification | Escalation |
|----------|--------------|--------------|------------|
| 🔴 Critical | <5 min | PagerDuty + Slack + Email | CTO in 15 min |
| 🟡 Warning | <30 min | Slack + Email | Team Lead in 2 hours |
| ℹ️ Info | <4 hours | Slack (quiet channel) | Review in standup |

### On-Call Contacts
| Role | Primary | Backup |
|------|---------|--------|
| Backend | ${ONCALL_BACKEND} | ${BACKUP_BACKEND} |
| Infrastructure | ${ONCALL_INFRA} | ${BACKUP_INFRA} |
| Database | ${ONCALL_DB} | ${BACKUP_DB} |
| Security | ${ONCALL_SECURITY} | ${BACKUP_SECURITY} |

---

## 🔄 Post-Incident Process

1. **During incident:** Update `#preskool-incidents` Slack channel every 15 min
2. **After resolution:** Write incident report within 24 hours
3. **Blameless postmortem:** Schedule within 3 business days
4. **Action items:** Track in JIRA with deadlines
5. **Runbook update:** If new learnings, update this document
