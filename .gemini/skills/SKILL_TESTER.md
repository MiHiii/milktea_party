---
name: Tester Skill
description: Test execution methodology, test case structure, bug reporting, and evidence policy
---

# 🧪 Tester Skill — Testing Methodology & Reporting

---

## 1. Test Case Structure

### Format bắt buộc cho mỗi `TEST-xxx`

| Field | Description | Example |
|-------|-------------|---------|
| **ID** | `TEST-xxx` | `TEST-001` |
| **Target** | Task/API being tested | `API-005` |
| **Objective** | What is being validated | Calculate shipping with voucher |
| **Precondition** | Initial state required | Session OPEN, ≥2 participants |
| **Steps** | Numbered steps to execute | 1. Add item A (50k)... |
| **Expected** | Expected outcome | Shipping split proportionally |
| **Actual** | Filled after execution | (Updated after test) |
| **Status** | ✅ Pass / ❌ Fail | ✅ |

---

## 2. Testing Scope

### Test Types by Priority
| Type | When | Tool |
|------|------|------|
| **API Testing** | Every endpoint | cURL / Postman / httpie |
| **UI Testing** | Every UI change | Browser (Chrome DevTools) |
| **E2E Testing** | Core flows | Playwright / Cypress |
| **WebSocket Testing** | Realtime features | Custom scripts |
| **Performance** | Before major release | k6 / Artillery |

### Coverage Requirements
- **Every task** must have ≥3 test scenarios:
  1. ✅ Positive (happy path)
  2. ❌ Negative (invalid input, unauthorized access)
  3. 🔲 Boundary (min/max values, empty data, edge cases)

---

## 3. E2E Testing Methodology

### Scenario Design
Mô phỏng full user journey:
```
Open App → Create Session → Join → Order Items → Lock → Checkout → Verify QR → Complete
```

### Data Consistency Check
- UI display phải khớp 100% với API response
- API response phải khớp 100% với database
- Verify ở cả 3 lớp: **UI ↔ API ↔ DB**

### Environment
- Execute trên **Staging/Preview** environment
- Mỗi test run dùng clean data (hoặc setup/teardown)
- Test trên ít nhất: Mobile Chrome + Desktop Chrome

---

## 4. Bug Reporting Format

### Registry Bug Tracker
```markdown
| Bug ID | Related | Description | Severity | Status |
|--------|---------|-------------|----------|--------|
| BUG-xxx | API-005 | Negative qty accepted | High | Open |
```

### Bug Report Details (khi create)
```markdown
## BUG-xxx: [Short description]
- **Severity**: Critical / High / Medium / Low
- **Related Task**: FEAT-xxx / API-xxx
- **Environment**: Staging / Preview / Production

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected
[What should happen]

### Actual
[What actually happened]

### Evidence
[Screenshot / Video / Response JSON]
```

### Severity Classification
| Level | When | SLA |
|-------|------|-----|
| Critical | Data loss, security breach | Fix same day |
| High | Core feature broken | Fix within sprint |
| Medium | Non-core feature issue | Next sprint |
| Low | Cosmetic, minor UX | Backlog |

---

## 5. Evidence & Reporting Policy

| Scenario | What to Report |
|----------|---------------|
| **All Pass** | ✅ "All X scenarios passed" (1 line summary) |
| **Critical Path** | Save 1 JSON response as evidence in `tests/REPORTS.md` |
| **Failure** | Full detail: Expected vs Actual + error code + screenshot |
| **Retest** | Reference BUG-xxx + confirm fix |

### Log Retention
- Keep only **latest** test results per task
- Delete previous runs to prevent file bloat
- Archive evidence for P0 features for 30 days

---

## 6. Verify (Retest) Workflow

When Dev marks bug as "Fixed":
1. Pull latest code / check preview deploy
2. Re-execute exact same steps from bug report
3. Verify fix doesn't introduce regression
4. If fixed: ✅ Update bug status → `Verified`
5. If not fixed: ❌ Reopen with additional details

---

## 7. Definition of Done (Test Sign-off)

Tester marks TEST ✅ only when:
- [ ] All positive scenarios pass
- [ ] ≥3 negative/boundary scenarios tested
- [ ] All related bugs are Verified (status `Fixed`)
- [ ] UI data matches API response (100%)
- [ ] Tested on mobile viewport
