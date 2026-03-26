---
name: PM Skill
description: Sprint management methodology, registry standards, and task lifecycle
---

# 📑 PM Skill — Sprint Management & Registry

---

## 1. Registry Management (`docs/REGISTRY.md`)

### Task ID Format
| Type | Format | Example |
|------|--------|---------|
| Feature | `FEAT-xxxxx` | `FEAT-00005` |
| API endpoint | `API-xxxxx` | `API-00012` |
| Bug fix | `BUG-xxxxx` | `BUG-00003` |
| Refactor | `REFAC-xxxxx` | `REFAC-00001` |
| DevOps | `OPS-xxxxx` | `OPS-00002` |

### Registry Table Format
```markdown
| ID | Description | Priority | Sprint | DEV | TEST | QC | Status |
|----|-------------|----------|--------|-----|------|-----|--------|
| FEAT-00005 | Calculate shipping | P0 | S3 | ✅ | ✅ | ✅ | DONE |
| API-00012 | Settlement endpoint | P1 | S3 | 🏗️ | ⬜ | ⬜ | IN_PROGRESS |
```

### Status Flow
```
BACKLOG → SPRINT BACKLOG → IN_PROGRESS → IN_TESTING → IN_REVIEW → DONE
                                ↑                          ↓
                                └────── RE-OPEN ←──────────┘
```

---

## 2. Sprint Lifecycle

### Sprint Duration
- Default: 2 weeks
- Ceremony schedule:
  - **Day 1**: Sprint Planning
  - **Day 1–10**: Development + Daily Standup (15 min/day)
  - **Day 8**: Backlog Grooming (prep next sprint)
  - **Day 10**: Sprint Review + Retrospective

### Sprint Planning Process
1. PM chọn tasks từ Backlog dựa trên priority (P0 > P1 > P2)
2. Dev confirm capacity (trừ PTO, meetings)
3. Tổng story points ≤ 80% team capacity
4. Sprint Goal phải measurable
5. Mọi task đã pass DoR

### Backlog Grooming
- 3 ngày trước Sprint Planning
- Tasks > 8 points phải tách nhỏ
- Clarify AC với BA nếu thiếu
- Estimate bằng story points (Fibonacci: 1, 2, 3, 5, 8, 13)

---

## 3. Definition of Ready (DoR)

Task chỉ được vào Sprint khi:
- [ ] Có ID trong Registry
- [ ] Liên kết với REQ/FEAT ref
- [ ] BA đã hoàn thành Spec + AC
- [ ] Priority đã xác định (P0/P1/P2)
- [ ] Estimate ≤ 8 story points
- [ ] Không có dependency chưa resolved

---

## 4. Definition of Done (DoD)

Task chỉ DONE khi cả 3 cột ✅:
1. **DEV ✅**: Code pass lint, fmt, unit tests pass 100%
2. **TEST ✅**: Test cases executed, ≥3 scenarios pass, no open bugs
3. **QC ✅**: Code audit pass, security check OK

→ PM chuyển Status thành **DONE**

---

## 5. Priority Classification

| Level | Label | SLA | When |
|:-----:|-------|-----|------|
| P0 | Critical | Within current sprint | Core feature, data integrity, security |
| P1 | High | Next 1–2 sprints | Important feature, major UX issue |
| P2 | Medium | Backlog (prioritized) | Nice-to-have, optimization |
| P3 | Low | Backlog (unprioritized) | Cosmetic, minor improvement |

---

## 6. Bug Triage in Sprint

### Bug Tracker Format
```markdown
| Bug ID | Related Task | Description | Severity | Status |
|--------|-------------|-------------|----------|--------|
| BUG-00001 | API-00005 | Negative qty accepted | High | Open |
```

### Triage Rules
- **P0 bug** in Sprint → Fix immediately, same Sprint
- **P0 bug** too large → Remove related task from Sprint, move to Backlog
- **P1/P2 bugs** → Add to next Sprint Backlog
- Bug fixer reports back to Tester for verify

### Bug ID Format
- 5-digit zero-padded: `BUG-00001`, `BUG-00002`, ...

---

## 7. Velocity & Reporting

### Metrics to Track
- **Velocity**: Story points completed per Sprint
- **Commitment accuracy**: Points committed vs completed (target ≥ 80%)
- **Bug escape rate**: Bugs found in production vs total bugs (target < 5%)
- **Sprint burndown**: Daily progress tracking

### Capacity Planning
- Use average velocity from last 3 sprints
- Deduct 20% for tech debt, bugs, unexpected
- Never commit more than actual capacity
