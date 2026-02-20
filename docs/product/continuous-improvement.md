# PreSkool ERP — Continuous Improvement Framework

> "Make it work → Make it right → Make it fast → Make it delightful"

---

## 1. Sprint Retrospective Format

**Cadence:** Last Friday of every sprint (45 minutes)  
**Attendees:** Full engineering + product team  
**Facilitator:** Rotating (not the Engineering Lead)

### Format: Start / Stop / Continue

```markdown
## Sprint Retro — Sprint X (dates)
**Facilitator:** [Name]  
**Attendees:** [list]

### ✅ What went well (Keep doing)
-
-

### 🛑 What didn't go well (Stop doing)
-
-

### 🚀 What to try next sprint (Experiments)
-
-

### Action Items
| Action | Owner | By When |
|--------|-------|---------|
|        |       |         |
```

### Retro Health Metrics

Track these each retro to trend improvement:

| Metric | This sprint | Trend |
|--------|------------|-------|
| Sprint velocity (points completed / planned) | | ↑↓→ |
| Bugs introduced in sprint | | ↑↓→ |
| P1/P2 bugs escaped to production | | ↑↓→ |
| Avg PR review time | | ↑↓→ |
| On-call pages per engineer | | ↑↓→ |
| Unplanned work % | | ↑↓→ |

---

## 2. OKR Template (Quarterly)

> OKRs set the direction; sprints do the work.

### Q_ 20__ OKRs

**Company Mission:** Empower every school in India with world-class ERP software.

---

**Objective 1: Best-in-class reliability**

| Key Result | Target | Current | Status |
|-----------|--------|---------|--------|
| Uptime (SLA) | ≥ 99.9% | | 🟡 |
| P0 incidents | 0 | | 🟢 |
| P95 latency | < 500ms | | 🟡 |
| User satisfaction (avg feedback rating) | ≥ 4.0 ⭐ | | 🟡 |

---

**Objective 2: Accelerate user value**

| Key Result | Target | Current | Status |
|-----------|--------|---------|--------|
| Features shipped from RICE backlog | ≥ 5 (RICE > 300) | | 🟡 |
| Feedback-to-fix cycle time (P2) | ≤ 1 sprint | | 🟡 |
| New module DAU adoption | ≥ 60% of tenants | | 🟡 |

---

**Objective 3: Scale the platform**

| Key Result | Target | Current | Status |
|-----------|--------|---------|--------|
| Tenant count | +25% | | 🟡 |
| DB query P95 | < 200ms | | 🟡 |
| Test coverage (backend) | ≥ 80% | | 🟡 |

**Status:** 🟢 On Track | 🟡 At Risk | 🔴 Off Track | ✅ Done

---

## 3. Release Notes Template

Publish release notes in `CHANGELOG.md` and send to all school admins via email.

```markdown
## v1.X.0 — Released 2026-MM-DD

### 🎉 New Features
- **[Module]** Feature name — brief description
- **[Fees]** WhatsApp payment reminders — schools can now send fee reminders via WhatsApp

### 🔧 Improvements
- **[Attendance]** Marking attendance is now 40% faster
- **[Reports]** Grade reports now export as PDF with school letterhead

### 🐛 Bug Fixes
- **[Students]** Fixed issue where student profile photos didn't save on Safari
- **[Fees]** Fixed duplicate fee entry on double-click

### ⚠️ Breaking Changes
- None

### 🔄 Migration Notes
- Run `alembic upgrade head` (handled automatically on deploy)

---
*To report issues: use the 💬 Feedback button in the app or email support@preskool.com*
```

---

## 4. Definition of Done (DoD)

A ticket is **Done** only when ALL of the following are true:

### Code Quality
- [ ] Feature works as described in acceptance criteria
- [ ] Unit tests written (backend: pytest, frontend: Vitest)
- [ ] Code review approved by ≥ 1 engineer
- [ ] No new TypeScript errors / Python linting failures
- [ ] No new `console.error` in frontend output

### Testing
- [ ] Tested in staging by the author
- [ ] QA sign-off (for P1 features or risk areas)
- [ ] Playwright e2e not broken (`npx playwright test`)
- [ ] No new `npm audit` CRITICAL or HIGH vulnerabilities

### Deployment
- [ ] PR merged to `main` (not just `develop`)
- [ ] CD pipeline green (build + deploy + smoke test)
- [ ] No error spike in Grafana for 15 minutes post-deploy

### Documentation
- [ ] API changes reflected in FastAPI auto-docs (`/api/v1/docs`)
- [ ] Any new environment variable documented in `.env.example`
- [ ] CHANGELOG.md entry added under `Unreleased`

---

## 5. Engineering Health Scorecard

Review monthly during the retrospective:

| Area | Health Check | Score (1–5) | Action if < 3 |
|------|-------------|------------|--------------|
| **Test coverage** | `pytest --cov` ≥ 80% | | Add test sprint |
| **Build time** | CI < 10 min | | Parallelise or cache |
| **Deploy frequency** | ≥ 2/week | | Remove blockers |
| **MTTR** | < 2 hour (P0) | | Improve runbooks |
| **Lead time for changes** | < 2 days | | Reduce PR size |
| **Change failure rate** | < 5% | | Add staging gates |
| **Tech debt ratio** | < 20% of sprint | | Schedule debt sprint |
| **Avg PR size** | < 400 lines | | Enforce PR size limit |

> Based on the [DORA Four Key Metrics](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance) framework.

---

## 6. Feedback Loop Cycle

```
Users submit feedback (FeedbackWidget)
         ↓
Weekly: bash scripts/analyze-feedback.sh
         ↓
Monthly: Prioritization meeting (RICE scoring)
         ↓
Sprint planning: Top items enter sprint
         ↓
Build → Test → Deploy
         ↓
Release notes sent to users
         ↓
Users submit new feedback ← (cycle repeats)
```
