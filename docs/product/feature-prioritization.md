# PreSkool ERP — Feature Prioritization Framework

> **Method:** RICE Scoring (Reach × Impact × Confidence ÷ Effort)  
> **Cadence:** Reviewed monthly in Sprint Planning  
> **Owner:** Product Manager + Engineering Lead

---

## RICE Score Formula

```
RICE = (Reach × Impact × Confidence) / Effort
```

| Dimension | What it measures | Scale |
|-----------|-----------------|-------|
| **Reach** | Users impacted per quarter | # of users (e.g., 500) |
| **Impact** | Effect on conversion/retention/satisfaction | 3 = Massive, 2 = High, 1 = Medium, 0.5 = Low, 0.25 = Minimal |
| **Confidence** | Certainty in the above estimates | 100% = High, 80% = Medium, 50% = Low |
| **Effort** | Engineering person-months to ship | Decimal (0.5 = 2 weeks, 1 = 1 month) |

### Impact Scale Guide

| Score | Description | Example |
|-------|------------|---------|
| 3 — Massive | Core workflow improvement used by every user daily | Faster attendance marking |
| 2 — High | Significant improvement for primary persona | Monthly grade report PDF |
| 1 — Medium | Meaningful but limited scope | Filter on reports page |
| 0.5 — Low | Nice-to-have for minority of users | Dark mode |
| 0.25 — Minimal | Edge case or cosmetic | Mobile icon tweak |

---

## Feature Backlog (Scored)

> Update this table after each feedback analysis cycle. Sort by RICE score (descending).

| Feature | Module | Source | Reach | Impact | Confidence | Effort | **RICE** | Decision |
|---------|--------|--------|-------|--------|-----------|--------|---------|---------|
| Mobile app for attendance | Attendance | Feedback × 18 | 200 | 2 | 80% | 3 | **107** | 🟡 Consider |
| Bulk fee collection import | Fees | Feedback × 14 | 150 | 2 | 80% | 2 | **120** | 🟢 Ship |
| WhatsApp notifications | Notifications | Feedback × 22 | 500 | 2 | 80% | 1.5 | **533** | 🟢 Ship |
| Parent mobile app | Parent | Roadmap | 300 | 3 | 50% | 5 | **90** | 🟡 Consider |
| AI-powered grade insights | Grades | Internal | 400 | 1 | 50% | 4 | **50** | 🔴 Park |
| Custom report builder | Reports | Feedback × 8 | 100 | 2 | 80% | 3 | **53** | 🔴 Park |
| Biometric attendance integration | Attendance | Feedback × 6 | 80 | 2 | 50% | 4 | **20** | 🔴 Park |
| Timetable auto-generation | Timetable | Feedback × 11 | 120 | 2 | 80% | 2 | **96** | 🟡 Consider |
| Fee reminder SMS | Fees | Feedback × 19 | 400 | 2 | 100% | 0.5 | **1600** | 🟢 Ship |
| Student ID card generator | Students | Feedback × 7 | 200 | 1 | 80% | 0.5 | **320** | 🟢 Ship |

---

## Decision Thresholds

| RICE Score | Decision | Next Step |
|-----------|---------|----------|
| > 300 | 🟢 **Ship** — high priority | Add to next sprint or quarter |
| 50–300 | 🟡 **Consider** — validate first | User interviews, prototype |
| < 50 | 🔴 **Park** — low ROI | Revisit in 6 months |

---

## Prioritization Meeting Agenda (Monthly, 1 hour)

1. **(10 min)** Review feedback analysis report: `bash scripts/analyze-feedback.sh`
2. **(15 min)** Add new feature requests to the backlog table above
3. **(20 min)** Score new items using RICE; re-score changed items
4. **(10 min)** Set quarterly top-5 priorities
5. **(5 min)** Assign owners for next iteration

### Meeting Inputs Checklist
- [ ] Feedback stats: `GET /api/v1/feedback/stats`
- [ ] Bug count by module (from JIRA/bug tracker)
- [ ] Customer requests (from Zendesk/email)
- [ ] Performance regression areas (from `bash scripts/perf-analysis.sh`)
- [ ] Previous quarter OKR results
