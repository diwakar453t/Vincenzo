# PreSkool ERP — On-Call Schedule & Rotation Policy

> **Maintained by:** Engineering Lead  
> **Updated:** Before each sprint start  
> **On-Call SLA:** Acknowledge P0/P1 within 5 minutes

---

## 1. On-Call Rotation Schedule

> Update this table every sprint. Each engineer is on-call for one week (Mon 09:00 → Mon 09:00 IST).

| Week | Primary | Secondary (backup) | Dates |
|------|---------|-------------------|-------|
| Week 1 | | | 2026-03-02 → 2026-03-09 |
| Week 2 | | | 2026-03-09 → 2026-03-16 |
| Week 3 | | | 2026-03-16 → 2026-03-23 |
| Week 4 | | | 2026-03-23 → 2026-03-30 |
| Week 5 | | | 2026-03-30 → 2026-04-06 |
| Week 6 | | | 2026-04-06 → 2026-04-13 |

### Rotation Order
Engineering team rotates in alphabetical order. Each engineer takes one week primary, following week as secondary (shadow for first-timers).

---

## 2. Escalation Policy

```
Alert fires
    │
    ▼ (0–5 min)
L1 — On-Call Primary (auto-paged via PagerDuty)
    │
    │ Not acknowledged after 5 min
    ▼ (5–10 min)
L2 — On-Call Secondary (auto-escalated via PagerDuty)
    │
    │ Not resolved after 15 min OR P0 outage
    ▼ (15+ min)
L3 — Engineering Lead (manual call)
    │
    │ CTO/Customer impact
    ▼ (30+ min for P0)
L4 — CTO + Customer Communications Lead
```

### Response Time SLAs

| Severity | Acknowledge | Initial Response | Resolution Target |
|----------|-------------|-----------------|-------------------|
| P0 — Complete Outage | 5 min | 10 min | 2 hours |
| P1 — Partial Outage | 10 min | 15 min | 4 hours |
| P2 — Degraded | 30 min | 1 hour | Next business day |
| P3 — Minor | 4 hours | Next standup | Sprint backlog |

---

## 3. Handoff Process

### At End of On-Call Week

1. **Handoff meeting:** 15-minute sync with incoming primary (Friday or preceding Monday)
2. **Update handoff notes** (template below)
3. **Transfer PagerDuty** schedule override if needed
4. **Brief incoming engineer** on any ongoing incidents or known issues

### Handoff Notes Template

```
## On-Call Handoff — Week of <DATE>
**Outgoing:** [Name]  
**Incoming:** [Name]

### Open Incidents / Known Issues
- [ ] Issue: <description> | Status: <monitoring/resolved> | Ticket: <link>

### Pending Alerts (non-critical, needs follow-up)
- <alert name> — <what it means> — <suggested action>

### Environment Changes / Config Changes This Week
- <change description> | deployed: <date> | PR: <link>

### Things to Watch
- <anything unusual or scheduled maintenance>

### Useful Commands This Week
```bash
# <any custom kubectl/debug commands discovered>
```
```

---

## 4. On-Call Expectations

### During Business Hours (09:00–18:00 IST)
- Acknowledge P0/P1 alerts within **5 minutes**
- Available on Slack (`#preskool-incidents`, `#preskool-alerts`)
- Can request help from team freely

### Outside Business Hours
- Acknowledge P0/P1 alerts within **5 minutes** via PagerDuty
- For P2/P3: address next business day
- If unsure: escalate, don't guess on production changes at 3am
- **You are NOT expected to fix everything solo at night** — escalate to L2/L3

### On-Call Kit (Bookmark These)
- Grafana: `https://grafana.preskool.com/d/preskool-slo`
- Loki Logs: `https://grafana.preskool.com/explore` (datasource: Loki)
- Jaeger Traces: `https://grafana.preskool.com/explore` (datasource: Tempo)
- Alertmanager UI: `https://alertmanager.preskool.com`
- Runbooks: `observability/runbooks/incident-response.md`
- PagerDuty: `https://preskool.pagerduty.com`
- Incident Response Plan: `docs/incident-response-plan.md`

---

## 5. Compensation & Well-Being

| Type | Compensation |
|------|-------------|
| Weekday on-call (business hours) | Part of normal role |
| Weekend on-call | 0.5 day off per weekend |
| Woken after midnight (P0) | 0.5 day off next day |
| Exceeded SLA (>4h to resolve P0) | Postmortem improvement sprint |

> Engineering Lead reviews on-call load quarterly. No engineer should be on-call > 25% of their time.

---

## 6. Contact Directory

| Role | Name | Phone | Slack | PagerDuty |
|------|------|-------|-------|-----------|
| Engineering Lead | | | | |
| Backend Lead | | | | |
| Database Lead | | | | |
| DevOps Lead | | | | |
| CTO | | | | |
| Customer Success Lead | | | | |
