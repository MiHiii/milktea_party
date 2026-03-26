---
name: BA Skill
description: Business analysis methodology, spec writing standards, and hand-off checklist
---

# 👔 BA Skill — Methodology & Deliverables

---

## 1. Spec Writing Methodology

### API Specification — Structure Strategy
Khi dự án lớn lên, file `api_spec.md` sẽ quá dài (>500 lines). BA phải **chủ động tách** thành modules:

```
docs/
├── api_spec.md                    # Index file — liệt kê tất cả modules
└── specs/
    └── api/                       # Module files
        ├── session.md             # Session endpoints
        ├── participant.md         # Participant endpoints
        ├── order.md               # Order endpoints
        └── settlement.md         # Settlement endpoints
```

### `api_spec.md` — Index File Format (khi đã tách)
```markdown
# API Specification — Index
| Module | Endpoints | File |
|--------|-----------|------|
| Session | Create, Get, Update, Delete | [session.md](specs/api/session.md) |
| Participant | Join, Leave, Heartbeat | [participant.md](specs/api/participant.md) |
| Order | Add, Update, Delete, Batch | [order.md](specs/api/order.md) |
| Settlement | Calculate, VietQR, Confirm | [settlement.md](specs/api/settlement.md) |
```

### Module File Format (mỗi file)
```markdown
# {Module Name} API
> Owner: BA | Last Updated: {date}
> Related Tasks: REQ-xxxxx, FEAT-xxxxx

## Endpoints

### [METHOD] /api/v1/{resource}
- **Description**: What this endpoint does
- **Auth**: Required headers
- **Request Body**:
  ```json
  { "field": "type — description" }
  ```
- **Response 200**:
  ```json
  { "data": { ... }, "meta": { ... } }
  ```
- **Error Cases**:
  | Code | When |
  |------|------|
  | `VALIDATION_FAILED` | ... |
  | `RESOURCE_NOT_FOUND` | ... |
```

### Khi nào tách spec?
| Trigger | Action |
|---------|--------|
| `api_spec.md` > 300 lines | Bắt đầu tách module đầu tiên |
| > 5 resource domains | Mỗi domain = 1 module file |
| Team > 3 devs | Tách để tránh merge conflicts |

### Checklist khi viết spec
- [ ] Versioning rõ ràng (`/api/v1/...`)
- [ ] Request/Response format đồng nhất (JSON envelope)
- [ ] Error codes tuân thủ `rules/api-convention.md`
- [ ] Security headers được định nghĩa
- [ ] Pagination cho collection endpoints
- [ ] Nếu > 300 lines, đã tách thành modules

---

## 2. Business Logic Documentation

### Format công thức
Mọi business rule phải viết dưới dạng:
```
INPUT:  [list of input variables]
RULE:   [formula or algorithm in plain text]
OUTPUT: [expected result with example]
EDGE:   [edge cases and how to handle]
```

### Rounding Strategy
- Quy định rõ: round ở đâu? (item level vs bill level)
- Residual handling: phần lẻ sau khi chia phân bổ cho ai?
- Document bằng ví dụ số cụ thể, dễ verify

---

## 3. Acceptance Criteria (AC)

### Gherkin Format (bắt buộc)
```gherkin
Feature: [Feature name]

  Scenario: [Scenario description]
    Given [initial state]
    When [action performed]
    Then [expected outcome]
    And [additional verification]
```

### AC Quality Checklist
- [ ] Mỗi scenario có Given/When/Then rõ ràng
- [ ] Cover positive path (happy path)
- [ ] Cover ít nhất 3 negative/boundary cases
- [ ] Boundary values được chỉ định cụ thể (min, max)
- [ ] AC map 1:1 với test cases mà Tester sẽ viết

---

## 4. User Flow Design

### Deliverable Format
- Text-based flow diagram hoặc Mermaid syntax
- Rõ ràng: Start → Decision points → End states
- Cover cả flow chính và flow lỗi (error flow)

```mermaid
graph TD
    A[User opens app] --> B{Has session?}
    B -->|Yes| C[Load session]
    B -->|No| D[Create session]
    D --> E[Share link]
    E --> F[Others join]
```

---

## 5. Edge Case Analysis

### Framework "What If?"
Mỗi feature phải trả lời:
- **Concurrent**: 2+ users cùng thao tác thì sao?
- **Network**: Mất mạng giữa chừng thì sao?
- **State conflict**: Trạng thái bị đổi bởi người khác thì sao?
- **Data limit**: Dữ liệu quá lớn/nhỏ/trống thì sao?
- **Permission**: Người không có quyền thao tác thì sao?

---

## 6. Hand-Off Checklist

Trước khi bàn giao cho PM và Dev:
- [ ] `api_spec.md` đã cập nhật đầy đủ endpoints
- [ ] Business logic có ví dụ số cụ thể, verified bằng tay
- [ ] Ít nhất 3 edge cases đã có phương án xử lý
- [ ] Mọi yêu cầu đã có AC (Gherkin format)
- [ ] UI/UX descriptions đã tối ưu cho mobile-first
- [ ] Đã thông báo cho Dev về các thay đổi logic quan trọng
