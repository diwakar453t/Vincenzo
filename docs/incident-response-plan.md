# PreSkool ERP — Incident Response Plan (IRP)

> **Version:** 1.0 | **Owner:** Engineering Lead  
> **Complements:** `observability/runbooks/incident-response.md` (technical runbooks per alert)  
> **Last Updated:** 2026-02-20

---

## 1. Purpose & Scope

This IRP defines **who does what, when, and how** during a production incident for the PreSkool ERP platform. It covers the full incident lifecycle from detection to post-mortem.

**Scope:** All production incidents affecting `erp.preskool.com` and `api.preskool.com`.

---

## 2. Severity Definitions

| Level | Name | Definition | Examples |
|-------|------|-----------|---------|
| **P0** | Complete Outage | All users cannot access the application | Login down, API returning 500s for all requests, DB unreachable |
| **P1** | Major Degradation | Core functionality broken for many users | Fee collection failing, attendance marking down, high error rate (>5%) |
| **P2** | Partial Impact | A module is degraded; workaround exists | Reports slow, library search failing, notifications not sending |
| **P3** | Minor Issue | Cosmetic or edge-case issue | UI glitch, slow export for large datasets, one tenant affected |

---

## 3. RACI Matrix

| Role | P0 | P1 | P2 | P3 | Responsibilities |
|------|----|----|----|----|-----------------|
| **Incident Commander (IC)** | R | R | A | — | Coordinates response, drives to resolution, declares severity |
| **On-Call Engineer (Primary)** | R | R | R | R | First responder, technical investigation, applies fixes |
| **On-Call Engineer (Secondary)** | R | I | I | — | Backup, additional hands for P0/P1 |
| **Engineering Lead** | A | A | I | I | Escalation point, approves risky actions (rollbacks) |
| **Communications Lead** (if Customer impact) | R | R | I | — | Status page updates, customer emails, Slack comms |
| **CTO** | I | I | — | — | Informed for P0/P1; available for media/customer escalation |
| **Database Lead** | C | C | — | — | Consulted on DB-related issues |

> R = Responsible | A = Accountable | C = Consulted | I = Informed

---

## 4. Incident Lifecycle

```
1. DETECTION  →  2. TRIAGE  →  3. CONTAIN  →  4. FIX  →  5. RESOLVE  →  6. REVIEW
```

### Phase 1: Detection (0–2 minutes)

| Source | Channel | Action |
|--------|---------|--------|
| Prometheus alert | PagerDuty + Slack `#preskool-alerts` | On-call acknowledges in PagerDuty |
| Customer report | Zendesk / School email | IC opens incident bridge |
| Health check failure | CD pipeline / UptimeRobot | IC declares severity |

**Action:** On-call acknowledges PagerDuty alert → opens `#preskool-incident-<YYYY-MM-DD>` Slack channel → posts initial message (see template below).

### Phase 2: Triage (2–10 minutes)

1. Check `observability/runbooks/incident-response.md` for the alert
2. Determine severity (P0/P1/P2/P3)
3. Page secondary if P0
4. Check Grafana SLO dashboard
5. Check Loki logs for exceptions
6. Check Jaeger for trace anomalies
7. Identify blast radius (all users? one tenant? one endpoint?)

### Phase 3: Contain (10–30 minutes)

**Principle:** Restore service first, root-cause second.

Options in order of risk:
1. **Restart/scale**: `kubectl rollout restart deployment/backend -n preskool`
2. **Rollback**: `bash scripts/rollback.sh` (if caused by a recent deploy)
3. **Circuit break**: Disable the affected feature via feature flag
4. **DB fix**: Run corrective SQL (via kubectl exec, DBA approval required)
5. **Traffic shift**: Route to older version via nginx weight

### Phase 4: Fix (30 min – 4 hours)

- Root cause identified
- Fix developed and tested in staging
- Fix deployed (via hotfix branch → CD pipeline → production gate)
- Or patch applied directly to running container (last resort)

### Phase 5: Resolve

1. Verify error rate returns to < 0.1%
2. Verify P95 latency < 500ms
3. Verify all K8s pods in Running state
4. Communication Lead: post "RESOLVED" update to status page and customers
5. Close PagerDuty incident
6. Archive incident Slack channel

### Phase 6: Review (within 72 hours)

- Write post-mortem using `docs/incident-response/post-mortem-template.md`
- Schedule blameless postmortem meeting (all involved engineers)
- Create JIRA tickets for all action items
- Update runbook if new learnings

---

## 5. Communication Templates

### 5.1 Incident Bridge Opening (Slack `#preskool-incident-YYYY-MM-DD`)

```
🚨 INCIDENT OPENED
━━━━━━━━━━━━━━━━━━
Severity: P<N>
Summary: <1-line description>
Impact: <who is affected, how many users>
Started At: <timestamp>
IC: @<your name>
On-Call: @<primary> + @<secondary>
PagerDuty: <link>
━━━━━━━━━━━━━━━━━━
Status: 🔴 INVESTIGATING
```

### 5.2 Update Every 15 Minutes (P0) / 30 Minutes (P1)

```
📍 UPDATE — <timestamp>
Status: 🔴 ONGOING / 🟡 MITIGATED / ✅ RESOLVED
Current Action: <what we're doing right now>
What We Know: <root cause hypothesis>
Next Update: <in N minutes>
```

### 5.3 Status Page Update (statuspage.io or public)

**Investigating:**
```
Title: Elevated Error Rates
Body: We are investigating elevated error rates affecting some users.
      Our engineers are actively working on this issue.
      Next update in 30 minutes.
Status: Degraded Performance
```

**Resolved:**
```
Title: Resolved - Elevated Error Rates
Body: The issue affecting [module] has been resolved as of [time].
      All systems are now operating normally.
      We will share a full postmortem within 72 hours.
Status: Operational
```

### 5.4 Customer Email Template (P0)

```
Subject: [ACTION REQUIRED / UPDATE] PreSkool ERP — Service Disruption

Dear School Administrator,

We are writing to inform you that PreSkool ERP experienced a service disruption
from [START TIME] to [END TIME] on [DATE].

Affected: [describe impact — e.g., "Fee collection and attendance marking were unavailable"]
Root Cause: [brief, non-technical explanation]
Resolution: [what was done to fix it]
Preventive Actions: [what we are doing to prevent recurrence]

We sincerely apologize for the inconvenience this has caused.
As a courtesy, we have extended your subscription by [N] day(s).

If you have any questions, please contact support@preskool.com.

— The PreSkool Team
```

---

## 6. Escalation Decision Tree

```
Alert fires
├── Is this affecting ALL users?
│   ├── YES → P0 → Page IC + Secondary immediately
│   └── NO → Continue triage
│
├── Is a critical module broken? (auth, fees, attendance, grades)
│   ├── YES → P1 → Page IC
│   └── NO → P2 or P3
│
├── Is there a workaround?
│   ├── NO → Escalate severity
│   └── YES → P2/P3 — schedule fix
│
└── Is data at risk? (corruption, loss, leak)
    ├── YES → P0 regardless of scale → Page IC + DB Lead + CTO
    └── NO → Standard triage
```

---

## 7. Forbidden Actions During Incidents

> ⛔ **Never do these without explicit IC approval:**

- Dropping or truncating database tables
- Disabling authentication or authorization
- Deleting K8s namespaces or PVCs
- Modifying production secrets without a second engineer
- Communicating directly with press/media

---

## 8. Post-Incident SLAs

| Deliverable | SLA |
|------------|-----|
| Incident report (internal) | Within 24 hours |
| Post-mortem meeting | Within 72 hours |
| Action items created in JIRA | Within 72 hours |
| Customer email (for P0/P1) | Within 2 hours of resolution |
| Runbook update (if applicable) | Within 1 week |
| Public post-mortem (optional) | Within 1 week |

---

## 9. Useful Quick Links

| Resource | URL |
|----------|-----|
| Grafana SLO Dashboard | `https://grafana.preskool.com/d/preskool-slo` |
| Alertmanager UI | `https://alertmanager.preskool.com` |
| PagerDuty | `https://preskool.pagerduty.com` |
| Loki Logs | `https://grafana.preskool.com/explore` (Loki datasource) |
| Jaeger Traces | `https://jaeger.preskool.com` |
| Technical Runbooks | `observability/runbooks/incident-response.md` |
| Rollback Script | `bash scripts/rollback.sh` |
| Status Page | `https://status.preskool.com` |
