---
name: QC Skill
description: Quality audit methodology, checklist, reject/approve workflow, and sign-off criteria
---

# 🛡️ QC Skill — Quality Audit & Sign-off

---

## 1. Audit Methodology

### Audit Layers (in order)
```
1. Code Quality    → Clean code, architecture compliance
2. Testing Audit   → TDD compliance, coverage adequacy
3. Security Audit  → IDOR, injection, data exposure
4. Performance     → DB queries, N+1, bundle size
5. Spec Compliance → Code matches BA spec exactly
6. Cross-Reference → Code = Spec = Test = Registry
```

### Audit Against Rules
Mỗi audit phải đối chiếu với:
- `rules/code-style.md` → Code quality
- `rules/testing.md` → Test quality
- `rules/security.md` → Security compliance
- `rules/error-handling.md` → Error handling
- `rules/database.md` → DB schema & queries
- `rules/api-convention.md` → API design
- `rules/git-workflow.md` → PR & commit standards

---

## 2. Quality Gate Checklist

### A. Code Quality
- [ ] Clean Architecture layers respected (no cross-layer imports)
- [ ] Functions ≤ 50 lines, files ≤ 300 lines
- [ ] No magic numbers or hardcoded values
- [ ] Meaningful variable/function names
- [ ] No `fmt.Println` / `console.log` / dead code
- [ ] Guard clauses used (no deep nesting)
- [ ] Error wrapping with context at every layer

### B. Testing Compliance
- [ ] Test files exist for all business logic (`*_test.go` / `*.test.ts`)
- [ ] Coverage ≥ 80% for service layer
- [ ] Coverage ≥ 90% for money/calculation functions
- [ ] Tests cover positive, negative, and boundary cases
- [ ] No "fake" tests that always pass

### C. Security
- [ ] Identity header validated on every mutating endpoint
- [ ] IDOR prevention: ownership verified before mutation
- [ ] No secrets/passwords/PII in API responses
- [ ] Input validation on both frontend and backend
- [ ] Rate limiting configured for public endpoints
- [ ] CORS whitelist configured (no wildcard in prod)

### D. Database
- [ ] Primary keys are UUID v7
- [ ] Migrations have both UP and DOWN
- [ ] No `SELECT *` in queries
- [ ] Foreign keys have indexes
- [ ] Parameterized queries (no string concatenation)

### E. API & Error Handling
- [ ] Response envelope follows standard format
- [ ] `error_code` + `trace_id` in all error responses
- [ ] Correct HTTP status codes used
- [ ] Validation errors return field-level details

### F. Spec Compliance
- [ ] Implementation matches `api_spec.md` exactly
- [ ] Business logic matches documented formulas
- [ ] UI matches design specifications

---

## 3. Reject Workflow

When QC finds violations:

```
1. Document: Which rule is violated + evidence
2. Classify: [MUST] blocking vs [SUGGEST] improvement
3. Action:
   - [MUST] → Set DEV column back to 🏗️
   - [MUST] → Request PM to update status → RE-OPEN
   - [SUGGEST] → Comment on PR, non-blocking
4. Report: "Vi phạm {RULE}: {description} — see {file}:{line}"
```

### Reject Message Format
```markdown
## ❌ QC REJECT — {TASK-ID}

### Violations
1. **[MUST] rules/security.md §2**: IDOR — `DeleteOrder` doesn't verify device ownership
   - File: `internal/handler/order_handler.go:45`
   - Fix: Add `deviceID` check before delete

2. **[SUGGEST] rules/code-style.md §5**: Function `ProcessOrder` is 67 lines (limit: 50)
   - File: `internal/service/order_service.go:120`
   - Suggestion: Extract validation into separate function

### Status Update
- DEV: 🏗️ (was ✅)
- TEST: ⬜ (pending DEV fix)
- QC: ❌
```

---

## 4. Approve & Sign-off

### Prerequisites
```
DEV ✅  +  TEST ✅  +  All [MUST] items resolved  =  QC ✅
```

### Sign-off Message Format
```markdown
## ✅ QC APPROVED — {TASK-ID}

### Audit Summary
- Code Quality: ✅ Clean, follows architecture
- Testing: ✅ Coverage 87%, all scenarios adequate
- Security: ✅ No issues found
- Performance: ✅ Queries optimized, indexes present
- Spec Match: ✅ 100% aligned

### Registry Update
- QC: ✅
- Status: → DONE
```

---

## 5. Performance Review Specifics

### Backend
- [ ] No N+1 query patterns
- [ ] Complex queries have proper indexes
- [ ] `context.Context` used for all DB/Network calls
- [ ] Connection pooling configured
- [ ] No goroutine leaks in WebSocket handlers

### Frontend
- [ ] Server Components used where possible (reduce bundle)
- [ ] Images optimized (Next.js Image component)
- [ ] No unnecessary re-renders (check dependency arrays)
- [ ] Lazy loading for heavy components
- [ ] LCP < 2.5s on mobile
