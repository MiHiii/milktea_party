---
name: Architect Skill
description: System design methodology, Tech Design Document template, ADR format, tech debt management
---

# 🏛️ Architect Skill — System Design & Decision Records

---

## 1. Tech Design Document (TDD)

### When TDD is Required
- New feature spanning ≥2 services/layers
- Database schema changes affecting ≥3 tables
- New external integration (payment, auth, third-party API)
- Architecture-level refactoring
- Performance-critical features

### TDD Template
```markdown
# TDD: {Feature Name}
**Author**: {name}  |  **Date**: {date}  |  **Status**: Draft / In Review / Approved

## 1. Problem Statement
What problem are we solving? Why now? What metric will improve?

## 2. Proposed Design

### 2.1 System Architecture
[Diagram — Mermaid or ASCII]

### 2.2 API Contract
[Key endpoints — request/response]

### 2.3 Database Schema Changes
[New tables, modified columns, migrations]

### 2.4 Data Flow
[Sequence diagram — how data flows through the system]

## 3. Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Option A | ... | ... | ... |
| Option B | ... | ... | Selected |

## 4. Risk & Mitigation
| Risk | Impact | Probability | Mitigation |
|------|--------|:-----------:|-----------|
| ... | High | Medium | ... |

## 5. Rollout Plan
- Phase 1: ...
- Phase 2: ...
- Rollback plan: ...

## 6. Open Questions
- [ ] Question 1?
- [ ] Question 2?
```

### TDD Review Process
1. Author writes TDD
2. Review by ≥2 senior engineers (1 business day)
3. Address comments, update TDD
4. Approval → development can start
5. TDD archived in `/docs/tdd/`

---

## 2. Architecture Decision Records (ADR)

### When ADR is Required
- Technology choice (framework, library, service)
- Data storage decision (SQL vs NoSQL, cache strategy)
- Authentication/authorization approach
- API versioning strategy
- Infrastructure decisions (cloud provider, hosting)

### ADR Template
```markdown
# ADR-{number}: {Decision Title}
**Date**: {date}  |  **Status**: Proposed / Accepted / Deprecated / Superseded

## Context
What situation prompted this decision? What technical or business forces are at play?

## Decision
What is the change we're making?

## Consequences
### Positive
- ...

### Negative
- ...

### Neutral
- ...

## Alternatives Considered
1. **Option A**: [description] — rejected because [reason]
2. **Option B**: [description] — rejected because [reason]
```

### ADR Rules
- Stored in `/docs/adr/` directory
- Numbered sequentially: `ADR-001-use-uuid-v7.md`
- Never delete — mark as Deprecated or Superseded
- Reference related ADRs

---

## 3. System Design Review

### Review Checklist
- [ ] **Scalability**: Will this work at 10x current load?
- [ ] **Reliability**: What happens when component X fails?
- [ ] **Security**: What's the attack surface?
- [ ] **Data integrity**: Can data be lost or corrupted?
- [ ] **Performance**: Any N+1 queries? Missing indexes?
- [ ] **Observability**: Can we debug issues in production?
- [ ] **Backward compatibility**: Does this break existing clients?
- [ ] **Migration path**: How do we get from current to target state?

### Design Principles
1. **KISS** — Keep It Simple, Stupid
2. **YAGNI** — You Aren't Gonna Need It (don't over-engineer)
3. **Separation of Concerns** — Clear boundaries between layers
4. **Fail Fast** — Detect and report errors early
5. **Idempotency** — Operations safe to retry

---

## 4. Tech Debt Management

### Classification
| Type | Example | Impact |
|------|---------|--------|
| **Deliberate** | "We'll refactor this next sprint" | Tracked, planned |
| **Accidental** | Discovered during code review | Add to backlog |
| **Bit Rot** | Outdated dependencies, deprecated APIs | Monitor, schedule |

### Tech Debt Budget
- **20% of sprint capacity** reserved for tech debt
- Non-negotiable — engineering is a partner, not a factory
- Track tech debt items in Registry with `REFAC-xxx` IDs
- Prioritize: security debt > performance debt > code quality debt

### When to Raise the Alarm
- Tests are being skipped "because they're slow"
- Developers are afraid to change Area X
- Same bug keeps recurring
- Onboarding new devs takes > 30 days
- Build time > 15 minutes

---

## 5. Capacity Planning

### Assessment Framework
```
1. Current metrics: QPS, response time, DB connections, storage
2. Growth projection: Expected growth in 3/6/12 months
3. Bottleneck identification: What breaks first at 2x/5x/10x load?
4. Scaling strategy: Horizontal vs Vertical for each component
5. Cost projection: Infrastructure cost at projected scale
```

### Performance SLOs
| Metric | Target |
|--------|--------|
| API response (p50) | < 100ms |
| API response (p99) | < 500ms |
| Page load (LCP) | < 2.5s |
| Uptime | 99.9% (8.7h downtime/year) |

---

## 6. Diagram Standards

### Tools
- **Mermaid** for inline diagrams (in markdown)
- **Draw.io** for complex architecture diagrams

### Required Diagrams per TDD
1. **System Architecture** — High-level component diagram
2. **Sequence Diagram** — Key API flow
3. **ER Diagram** — Database schema changes (if any)
