---
name: Dev Skill
description: Development methodology, TDD workflow, architecture patterns, and PR preparation
---

# 💻 Dev Skill — Technical Execution Standards

---

## 1. Task Execution Workflow

```
1. Receive Task ID from PM
2. Read Spec + AC from BA
3. Read TDD from Architect (if exists)
4. Create branch: feature/{TASK-ID}-{description}
5. Write tests first (TDD)
6. Implement code
7. Self-review (checklist below)
8. Create PR
9. Update Registry: DEV → ✅
```

### Branch Announcement
Mỗi phản hồi khi bắt đầu task phải thông báo:
```
🔀 Branch: feature/{TASK-ID}-{short-description}
📋 Task: {TASK-ID} — {description}
```

---

## 2. TDD Workflow

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│  🔴 RED   │────►│ 🟢 GREEN  │────►│ 🔵 REFAC  │──► repeat
│ Write     │     │ Minimal   │     │ Clean up  │
│ failing   │     │ code to   │     │ (tests    │
│ test      │     │ pass      │     │ still ✅) │
└───────────┘     └───────────┘     └───────────┘
```

### When TDD is Mandatory
- All calculation/formula functions
- All state machine transitions
- All validation logic
- All data transformation functions

### When Test-After is OK
- Thin HTTP handlers (integration test)
- UI components (visual testing)
- Config/setup code

---

## 3. Backend Architecture (Go)

### Layer Separation
```
internal/
├── domain/        # ❤️ Heart — Structs, Interfaces, Constants, Errors
│                  #    No imports from other layers
├── service/       # 🧠 Brain — Business logic
│                  #    Depends on: domain interfaces
│                  #    No DB knowledge
├── repository/    # 🤲 Hands — Data access (SQL/ORM)
│                  #    Implements: domain interfaces
└── handler/       # 🎭 Face — HTTP/WS transport
                   #    Depends on: service interfaces
                   #    Only request/response mapping
```

### File Organization
- 1 file = 1 concern (e.g., `session_service.go`, `session_repository.go`)
- Test file adjacent: `session_service_test.go`
- Constants file per package: `constants.go`

---

## 4. Frontend Architecture (Next.js / React)

### Component Strategy
```
ui/            → Atoms (Button, Input, Badge) — reusable, no business logic
components/    → Organisms (OrderForm, ParticipantList) — compose atoms
app/           → Pages + Layouts only — thin, delegates to components
lib/           → Utilities, API clients, constants
hooks/         → Custom hooks — encapsulate logic away from JSX
```

### Server vs Client Components
- **Default: Server Component** — no directive needed
- Add `"use client"` ONLY when needed: `useState`, `useEffect`, `onClick`, browser APIs
- Heavy logic → extract to hook or lib, keep component "dumb"

---

## 5. Database Migration Workflow

```
1. Design schema change (consult Architect if complex)
2. Write UP migration (follow rules/database.md)
3. Write DOWN migration (rollback)
4. Test on local DB
5. Include in PR with [MIGRATION] tag
```

### Migration Naming
```
{timestamp}_{description}.up.sql
{timestamp}_{description}.down.sql
```

---

## 6. PR Preparation Checklist

Trước khi tạo PR, Dev phải tự kiểm tra:

### Code Quality
- [ ] No magic numbers — all constants extracted
- [ ] No hardcoded URLs or secrets
- [ ] No `fmt.Println` / `console.log` in production code
- [ ] No unused variables or imports
- [ ] Functions ≤ 50 lines, files ≤ 300 lines

### Testing
- [ ] TDD: All unit tests pass (100%)
- [ ] Coverage maintains or improves baseline
- [ ] Edge cases tested (boundary values, null inputs)

### Standards
- [ ] Logic matches spec from BA (100%)
- [ ] API response follows `rules/api-convention.md`
- [ ] Error handling follows `rules/error-handling.md`
- [ ] `go fmt` / `npm run lint` clean

### Registry
- [ ] Updated DEV column → ✅ in `docs/REGISTRY.md`
- [ ] PR linked to Task ID
- [ ] Branch named correctly: `feature/{ID}-{desc}`

---

## 7. Code Review Response

When receiving review feedback:
- `[MUST]` → Fix before merge, no exceptions
- `[SUGGEST]` → Consider and respond, may decline with reason
- `[QUESTION]` → Answer in PR comments
- `[NITPICK]` → Fix if easy, otherwise note for future

---

## 8. Conflict Resolution

Nếu User yêu cầu viết code trái với spec của BA:
1. **Cảnh báo ngay lập tức**: "⚠️ Yêu cầu này mâu thuẫn với spec XYZ"
2. **Trích dẫn** phần spec bị ảnh hưởng
3. **Đề xuất** phương án thay thế
4. **Chỉ thực hiện** nếu User xác nhận override sau khi đã biết hậu quả
