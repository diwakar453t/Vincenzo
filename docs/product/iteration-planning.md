# PreSkool ERP — Iteration Planning Guide

> **Sprint Length:** 2 weeks  
> **Release Cadence:** Every 2 sprints (monthly)  
> **Versioning:** `MAJOR.MINOR.PATCH` (e.g., `1.2.0`)

---

## Sprint Cadence

```
Week 1 (Mon–Fri)                Week 2 (Mon–Fri)
┌─────────────────────┐         ┌─────────────────────────────┐
│ Planning (Mon 2hr)  │         │ Feature complete (Wed)       │
│ Dev + daily standups│         │ QA + staging deploy (Thu)   │
│                     │         │ Sprint review + retro (Fri) │
└─────────────────────┘         └─────────────────────────────┘
                                                   ↓
                                        Release (every 2 sprints)
```

---

## Sprint Planning Inputs

Gather these **before** the planning meeting:

```bash
# 1. Feedback summary
bash scripts/analyze-feedback.sh

# 2. Performance regressions
SKIP_PROMETHEUS=false bash scripts/perf-analysis.sh

# 3. Open bug count by severity
# (from JIRA filter: project=PRESKOOL AND issuetype=Bug AND status!=Done)

# 4. On-call incident review
# (from docs/incident-response/ post-mortems since last sprint)
```

### Sprint Input Checklist

| Input | Source | Person |
|-------|--------|--------|
| Feedback analysis report | `scripts/analyze-feedback.sh` | Product |
| RICE-scored feature backlog | `docs/product/feature-prioritization.md` | Product |
| Open P1/P2 bugs | JIRA | QA Lead |
| Performance issues | `scripts/perf-analysis.sh` | Engineering |
| SLA / SLO report (last sprint) | Grafana | DevOps |
| Post-mortem action items | `docs/incident-response/` | On-Call |

---

## Sprint Planning Meeting Agenda (2 hours)

| Time | Agenda Item |
|------|------------|
| 0:00–0:15 | Review velocity and capacity (story points available) |
| 0:15–0:30 | Bug review — P1/P2 bugs go to the top of the queue |
| 0:30–1:00 | Feature selection from RICE-scored backlog |
| 1:00–1:30 | Task breakdown and estimation |
| 1:30–1:45 | Assign owners; set sprint goal |
| 1:45–2:00 | Risk identification; dependencies flagged |

### Sprint Goal Template

```
This sprint we will [primary deliverable]
so that [user benefit],
validated by [acceptance criteria].
```

---

## Release Checklist (Monthly Release)

### Week Before Release (Code Freeze)

- [ ] All P1/P2 bugs resolved for this release
- [ ] PR reviews complete; `main` branch clean
- [ ] All automated tests passing (CI green)
- [ ] Security audit scan: `bash security/scripts/frontend-audit.sh`
- [ ] Staging deployed and QA sign-off complete
- [ ] UAT completed for major new features (`docs/uat/uat-scenarios.md`)
- [ ] Pre-flight checklist passed: `bash scripts/launch-checklist.sh`
- [ ] Backup taken: `make backup`
- [ ] Release notes drafted (see continuous improvement doc)

### Release Day

- [ ] Deploy to production (GitHub Actions → approve gate)
- [ ] Post-deploy smoke test passes
- [ ] Grafana SLO monitoring for 60 minutes post-deploy
- [ ] Release notes published (in-app + email + Slack)
- [ ] Update version in `package.json` and `pyproject.toml`
- [ ] Create Git tag: `git tag -a v1.X.0 -m "v1.X.0 release"`

### Post-Release (1–3 days)

- [ ] Monitor error rate, P95 latency, user feedback volume
- [ ] Check feedback widget for new bug reports related to release
- [ ] Run `bash scripts/analyze-feedback.sh` to surface any regressions
- [ ] Close JIRA release version

---

## Quarterly Roadmap Template

> Update each quarter. Group features by theme, not by sprint.

### Q1 2026 — Foundation & Stability

**Theme:** "Make what we have work flawlessly"  
**OKR link:** See `docs/product/continuous-improvement.md`

| Theme | Feature | Status | Target Sprint |
|-------|---------|--------|--------------|
| 🔒 Security | Two-factor authentication (TOTP) | 🟡 Planned | S1 |
| ⚡ Performance | Fee collection page < 300ms LCP | 🟡 Planned | S2 |
| 💬 Notifications | WhatsApp fee reminders | 🟢 In Progress | S1 |
| 📄 Reports | Student ID card PDF generator | 🟡 Planned | S2 |
| 📱 Mobile | Teacher attendance on mobile | 🔵 Research | S3 |

### Q2 2026 — Growth Features

**Theme:** "Add features that drive school growth"

| Theme | Feature | Status | Target Sprint |
|-------|---------|--------|--------------|
| 👪 Parent Portal | Parent mobile app (React Native) | 🔵 Research | S5 |
| 💰 Finance | Bulk fee CSV import | 🟡 Planned | S4 |
| 📊 Analytics | AI-powered attendance insights | 🔵 Research | S6 |
| 🗓️ Scheduling | Timetable auto-generation | 🟡 Planned | S5 |

**Status Key:** 🟢 In Progress | 🟡 Planned | 🔵 Research | ⬜ Backlog | ✅ Done

---

## Definition of Ready (for sprint entry)

A feature/bug is ready for a sprint when:
- [ ] Clear acceptance criteria written (Gherkin format preferred)
- [ ] Design mockup attached (for UI features)
- [ ] Backend API contract agreed (for full-stack features)
- [ ] Dependencies identified and resolved
- [ ] Story points estimated by the team
- [ ] Test plan outlined
