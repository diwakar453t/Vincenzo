# PreSkool ERP — Bug Triage Process

> **Purpose:** Standard lifecycle for bug reports from all sources (user feedback, Sentry, on-call, internal).

---

## 1. Bug Sources

| Source | Channel | Initial Owner |
|--------|---------|--------------|
| User feedback widget | `/api/v1/feedback` → Slack `#preskool-feedback` | Product |
| Production alert | PagerDuty → `#preskool-incidents` | On-Call |
| Internal tester | JIRA bug report | QA |
| Customer email | Zendesk → JIRA | Customer Success |
| Automated test failure | GitHub Actions → `#preskool-ci` | Engineer |

---

## 2. Severity Labels

| Label | Definition | SLA to Fix | Examples |
|-------|-----------|-----------|---------|
| **P1 – Critical** | Data loss, security breach, complete feature down | Before next release or hotfix | Login broken, fees not saving, wrong grades shown |
| **P2 – High** | Major feature degraded, affects many users | Current sprint | PDF export fails, table not loading |
| **P3 – Medium** | Non-critical issue, workaround exists | Next sprint | Filter not working, formatting issue |
| **P4 – Low** | Cosmetic, edge case | Backlog (prioritized quarterly) | Typo, wrong color, minor UX |

---

## 3. Triage Meeting

**Cadence:** Every Tuesday at 10:00 IST (30 min)  
**Attendees:** Engineering Lead, QA Lead, Product Manager  
**Input:** All new bugs from the past week (JIRA `Needs Triage` queue + feedback widget)

### Triage Questions (for each bug)

1. **Reproducible?** → If not, move to `Needs Info`
2. **Severity?** → Assign P1–P4 using table above
3. **Owner?** → Assign to an engineer
4. **Sprint?** → Schedule in current or next sprint
5. **Duplicate?** → Link to existing open bug if so

---

## 4. Hotfix vs. Sprint Decision Tree

```
Bug found
    │
    ▼
Is this P1 (critical)?
    │
  YES │  NO
    ─────────────────────────────────────────
    ▼                          ▼
HOTFIX immediately        Is this P2 (high)?
                               │
                            YES │  NO
                               ─────────────────────
                               ▼              ▼
                          Current sprint   Next sprint / Backlog
```

### Hotfix Process (P1)

1. Create JIRA ticket with `hotfix` label
2. Create branch from `main`: `hotfix/brief-description`
3. Fix + unit test
4. PR → Engineering Lead review (priority review, 1 hour SLA)
5. Merge to `main` → CD pipeline → production (with gate approval)
6. Verify fix in production
7. Merge `main` back into `develop`

---

## 5. Bug Lifecycle States

```
New → Triaged → In Progress → Review → Testing → Done
              ↓                                  ↑
        Needs Info ──────── (info received) ─────┘
              ↓
           Won't Fix / Duplicate (closed)
```

| State | Description |
|-------|------------|
| **New** | Just reported, not yet triaged |
| **Triaged** | Severity assigned, sprint scheduled |
| **In Progress** | Engineer actively working on fix |
| **Review** | PR open, awaiting code review |
| **Testing** | Fix merged to staging, QA verifying |
| **Done** | Deployed to production, verified |
| **Won't Fix** | Accepted risk or by-design behavior |

---

## 6. User Feedback Review

Check the feedback widget API weekly:

```bash
# View recent feedback (admin token required)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://erp.preskool.com/api/v1/feedback/?page_size=50" \
  | python3 -m json.tool

# Stats by module
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://erp.preskool.com/api/v1/feedback/stats" \
  | python3 -m json.tool
```

### Feedback Triage Rules

| Rating | Type | Action |
|--------|------|--------|
| 1–2 ⭐ | Bug | Create P2 JIRA immediately |
| 1–2 ⭐ | General/Feature | Acknowledge, log in backlog |
| 3 ⭐ | Any | Review in triage meeting |
| 4–5 ⭐ | Any | Share in `#preskool-wins` Slack |
| Any | Bug (module=fees/attendance/grades) | Escalate as P1 if confirmed |

---

## 7. Communication

When a bug is fixed and deployed, close the loop:

- **Internal Slack** (`#preskool-fixes`): `✅ Fixed: <brief description> — deployed in vX.X`
- **Customer** (if reported by school): Reply in Zendesk with resolution
- **Repeat reporter** (from feedback widget): No direct reply (anonymous), but update release notes
