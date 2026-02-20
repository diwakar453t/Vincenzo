# Blameless Post-Mortem — [Incident Title]

> **Instructions:** Complete this template within 72 hours of incident resolution.  
> Focus on systems and processes, not individuals. No blame, only learning.

---

## Metadata

| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-MMDD-N |
| **Severity** | P0 / P1 / P2 |
| **Date** | |
| **Duration** | Start: `___` → End: `___` → Total: `___` |
| **Incident Commander** | |
| **On-Call Engineer(s)** | |
| **Author(s)** | |
| **Reviewed by** | |
| **Status** | Draft / In Review / Final |

---

## 1. Executive Summary

> _One paragraph: What happened, who was affected, how long, and how it was resolved._

---

## 2. Impact

| Metric | Value |
|--------|-------|
| Duration | |
| Users / Tenants Affected | |
| Transactions Failed | |
| Data Loss? | Yes / No |
| SLA Breached? | Yes (available budget used: ___min) / No |
| Customer Complaints Received | |

---

## 3. Timeline

> _Document events chronologically. Include all significant actions taken._

| Time (IST) | Event | Who |
|------------|-------|-----|
| `HH:MM` | Incident started (first symptom observed) | Automated / |
| `HH:MM` | Alert fired in PagerDuty | Prometheus |
| `HH:MM` | On-call acknowledged | |
| `HH:MM` | Incident bridge opened in Slack | |
| `HH:MM` | Severity declared: P__ | |
| `HH:MM` | Root cause hypothesis: | |
| `HH:MM` | Mitigation action taken: | |
| `HH:MM` | Service restored | |
| `HH:MM` | Incident resolved and closed | |

---

## 4. Root Cause Analysis

### What Happened?

> _Describe the direct cause of the incident._

### Why Did It Happen? (5 Whys)

| Why # | Question | Answer |
|-------|----------|--------|
| Why 1 | Why did the service go down? | |
| Why 2 | Why did [answer 1] happen? | |
| Why 3 | Why did [answer 2] happen? | |
| Why 4 | Why did [answer 3] happen? | |
| Why 5 | Why did [answer 4] happen? | |

**Root Cause:** _[The fundamental reason — a process, design, or monitoring gap]_

### Contributing Factors

- [ ] Insufficient monitoring / alerting
- [ ] Missing test coverage
- [ ] Manual process error
- [ ] Configuration management gap
- [ ] Insufficient redundancy / HA
- [ ] Code defect
- [ ] Third-party dependency failure
- [ ] Capacity underestimation
- [ ] Other: ___

---

## 5. Detection & Response Assessment

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Time to Detection | < 5 min | | |
| Time to Acknowledge | < 5 min | | |
| Time to Mitigate | < 30 min (P0) | | |
| Time to Resolve | < 2 hr (P0) | | |
| Status Page Updated | < 15 min | | |
| Customer Notified | < 2 hr of resolution | | |

**What went well:**
- 

**What didn't go well:**
- 

---

## 6. Action Items

> _Every action item must have an owner and a due date._

| # | Action | Owner | Due Date | JIRA Ticket | Status |
|---|--------|-------|----------|-------------|--------|
| 1 | | | | | ☐ Open |
| 2 | | | | | ☐ Open |
| 3 | | | | | ☐ Open |

---

## 7. Lessons Learned

> _What should we do differently next time? What should we build / change / monitor?_

1. 
2. 
3. 

---

## 8. Sign-Off

| Role | Name | Date | Approved? |
|------|------|------|-----------|
| Engineering Lead | | | ☐ |
| Author | | | ☐ |
