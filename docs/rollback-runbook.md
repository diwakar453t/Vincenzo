# PreSkool ERP — Rollback Runbook

> **Keep open during any production incident**  
> See also: `docs/incident-response-plan.md`, `scripts/rollback.sh`

---

## When to Rollback vs. Hotfix

```
Incident detected
        │
        ▼
Was this triggered by a recent deployment?
        │
   YES  │  NO
   ─────┤────────────────────────────────────────
   ▼    ▼
ROLL   Not deployment-related →
BACK   Follow: incident-response-plan.md (Contain phase)

        ▼ (if rollback chosen)
Can we hotfix in < 20 minutes?
        │
   YES  │  NO
   ─────┤────────────────────────────────────────
   ▼    ▼
HOTFIX  ROLLBACK immediately
(if P2/P3 only)
```

**Rollback immediately (no debate) if:**
- P0 outage caused by a deployment in the last 2 hours
- Error rate > 10% after a deploy
- Crash-looping K8s pods after a deploy
- Any data corruption detected

---

## Rollback Types

| Type | Command | When |
|------|---------|------|
| **Full** (backend + frontend) | `bash scripts/rollback.sh` | Default — always start here |
| **Backend only** | `kubectl rollout undo deployment/backend -n preskool` | Frontend confirmed working |
| **Frontend only** | `bash scripts/rollback.sh --frontend-only` | Only UI broke |
| **DB downgrade** | `bash scripts/rollback.sh --db-only` | DB migration caused the issue |
| **Specific SHA** | `bash scripts/rollback.sh <sha>` | Need to target a specific version |
| **Previous K8s revision** | `kubectl rollout undo deployment/backend -n preskool` | Fastest option |

---

## Time-to-Rollback Targets

| Phase | Target Time | Notes |
|-------|------------|-------|
| Decision to rollback | < 10 min | Don't debate — rollback first |
| Script executed | < 2 min | `bash scripts/rollback.sh` |
| K8s pods healthy | < 5 min | Watch `kubectl rollout status` |
| Health endpoint 200 | < 8 min | `curl https://erp.preskool.com/api/v1/health` |
| **Total E2E** | **< 15 min** | P0 target |

---

## Step-by-Step Rollback Procedure

### Option 1: Automated (Recommended)

```bash
# Fastest path — auto-selects previous K8s revision
bash scripts/rollback.sh

# Or target a specific commit
bash scripts/rollback.sh abc1234f

# Dry-run first (see what it would do)
DRY_RUN=true bash scripts/rollback.sh
```

### Option 2: Manual K8s (If Script Unavailable)

```bash
# Step 1: Get kubeconfig
export KUBECONFIG=/path/to/production-kubeconfig

# Step 2: Check rollout history
kubectl rollout history deployment/backend -n preskool
kubectl rollout history deployment/frontend -n preskool

# Step 3: Roll back to previous revision
kubectl rollout undo deployment/backend -n preskool
kubectl rollout undo deployment/frontend -n preskool

# Step 4: Watch rollout
kubectl rollout status deployment/backend -n preskool --timeout=120s
kubectl rollout status deployment/frontend -n preskool --timeout=60s

# Step 5: Verify pods
kubectl get pods -n preskool

# Step 6: Verify health
curl -f https://erp.preskool.com/api/v1/health
```

### Option 3: Roll Back to Specific Image Tag

```bash
# Find the target image tag (previous successful SHA)
kubectl rollout history deployment/backend -n preskool
# or check deployment records:
cat deployment-records/latest.json

# Set the specific image
kubectl set image deployment/backend \
  backend=ghcr.io/your-org/preskool-backend:<PREVIOUS_SHA> \
  -n preskool

kubectl rollout status deployment/backend -n preskool --timeout=120s
```

---

## Database Migration Rollback

> ⚠️ **Requires DBA or Engineering Lead approval for production**

```bash
# Check current migration
kubectl exec -n preskool \
  $(kubectl get pod -n preskool -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- alembic current

# Check migration history
kubectl exec -n preskool \
  $(kubectl get pod -n preskool -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- alembic history

# Downgrade one step
kubectl exec -n preskool \
  $(kubectl get pod -n preskool -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- alembic downgrade -1

# Downgrade to specific revision
kubectl exec -n preskool \
  $(kubectl get pod -n preskool -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- alembic downgrade <revision_id>
```

> ⚠️ If the migration is **destructive** (e.g., drops columns/tables), you may need to **restore from backup** instead.  
> See: `docs/backup-recovery-runbook.md`

---

## Post-Rollback Verification

```bash
# 1. All pods Running
kubectl get pods -n preskool

# 2. No recent OOMKills
kubectl get events -n preskool --sort-by='.lastTimestamp' | tail -20

# 3. Error rate (Prometheus query)
curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_req_failed[5m])) / sum(rate(http_reqs[5m]))' \
  | python3 -m json.tool

# 4. P95 latency
curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, rate(http_req_duration_seconds_bucket[5m]))' \
  | python3 -m json.tool

# 5. Manual login test
curl -X POST https://erp.preskool.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@preskool.test","password":"AdminPass1!@#"}'
```

---

## Communication After Rollback

Post in `#preskool-incidents`:
```
⏪ ROLLBACK EXECUTED
━━━━━━━━━━━━━━━━━━━━
Rolled back from: <current SHA>
Rolled back to:   <previous SHA>
Reason:           <1-line>
Status:           ✅ Service restored / 🔴 Still investigating
Time elapsed:     <N> minutes
Next Step:        Root cause investigation / Post-mortem scheduled
━━━━━━━━━━━━━━━━━━━━
On-Call: @<name>
```

---

## Known Rollback Limitations

| Scenario | Rollback Works? | Alternative |
|----------|----------------|------------|
| Code bug introduced | ✅ Yes | Standard rollback |
| Frontend UI regression | ✅ Yes | `--frontend-only` |
| DB schema added a nullable column | ✅ Yes | Rollback + alembic downgrade |
| DB schema dropped a column | ⚠️ Partial | Restore from backup for dropped data |
| DB data corruption | ❌ No | Restore from backup (`backup-recovery-runbook.md`) |
| Infrastructure change (K8s config) | ⚠️ Partial | Revert kustomization manually |
| Third-party API change | ❌ No | Hotfix or use mock/fallback |
