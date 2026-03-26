# 👑 GEMINI MASTER CONTROL (v4.0)
## 🚀 Professional Team Mode: Milktea Party Project

**Tổng quan:**
*   **Dự án:** Milktea Party
*   **Stack:** Next.js 16, Go, PostgreSQL, Tailwind 4.
*   **Tiêu chuẩn chung:** `milktea-logic.md`, `REGISTRY.md`.
*   **Engineering Rules:** `.gemini/rules/` (bắt buộc cho mọi role)

---

## 👥 1. PHÂN VAI TRÁCH NHIỆM (Role Definitions)
Mọi yêu cầu bắt đầu bằng mã lệnh sẽ kích hoạt bộ kỹ năng tương ứng:

| # | Mã lệnh | Vai trò | Agent | Skill | Sản phẩm đầu ra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **/ba** | Business Analyst | `.gemini/agents/AGENT_BA.md` | `.gemini/skills/SKILL_BA.md` | `REQ-xxx` & `api_spec.md` |
| 2 | **/pm** | Project Manager | `.gemini/agents/AGENT_PM.md` | `.gemini/skills/SKILL_PM.md` | `REGISTRY.md` |
| 3 | **/dev** | Senior Developer | `.gemini/agents/AGENT_DEV.md` | `.gemini/skills/SKILL_DEV.md` | Source Code & Migrations |
| 4 | **/test** | Tester | `.gemini/agents/AGENT_TESTER.md` | `.gemini/skills/SKILL_TESTER.md` | `TEST-xxx` & Bug Report |
| 5 | **/qc** | Quality Control | `.gemini/agents/AGENT_QC.md` | `.gemini/skills/SKILL_QC.md` | Approve/Reject Sign-off |
| 6 | **/devops** | DevOps / SRE | `.gemini/agents/AGENT_DEVOPS.md` | `.gemini/skills/SKILL_DEVOPS.md` | CI/CD & Deploy |
| 7 | **/architect** | Tech Lead | `.gemini/agents/AGENT_ARCHITECT.md` | `.gemini/skills/SKILL_ARCHITECT.md` | TDD & ADR |

**Quick Reference:** Xem `.gemini/commands/README.md` để biết tất cả slash commands.

---

## ⚙️ 2. QUY TRÌNH PHỐI HỢP (Workflow Pipeline)

### 2.1 Giai đoạn Thiết kế (Architect & BA)
1.  **Architect (`/architect`)**: Thiết kế hệ thống, viết TDD, tạo ADR cho features lớn.
2.  **BA (`/ba`)**: Tiếp nhận yêu cầu, viết đặc tả nghiệp vụ chi tiết vào `api_spec.md`.

### 2.2 Giai đoạn Chuẩn bị (PM)
1.  **PM (`/pm`)**: Phân rã Spec thành các Task nhỏ (`FEAT-xxx`, `API-xxx`) trong `REGISTRY.md`.

### 2.3 Giai đoạn Thực hiện (Dev)
1.  **Dev (`/dev`)**: Nhận ID Task, đọc logic từ BA, TDD từ Architect, viết code theo TDD workflow.

### 2.4 Giai đoạn Kiểm soát (Test & QC)
1.  **Test (`/test`)**: Chạy các kịch bản `TEST-xxx` để xác nhận logic.
2.  **QC (`/qc`)**: Kiểm tra chất lượng code, bảo mật, tuân thủ rules.

### 2.5 Giai đoạn Phát hành (DevOps)
1.  **DevOps (`/devops`)**: CI/CD, deploy staging/production, monitoring, incident response.

---

## 📂 3. CẤU TRÚC TÀI LIỆU (Documentation Structure)
```plaintext
├── docs/
│   ├── api_spec.md       # [BA] - API specification
│   ├── milktea-logic.md  # [BA] - Business logic & formulas
│   ├── REGISTRY.md       # [PM] - Task registry & status
│   ├── tdd/              # [Architect] - Tech Design Documents
│   └── adr/              # [Architect] - Architecture Decision Records
│
├── .gemini/
│   ├── agents/           # WHO — Role personas (7 files)
│   ├── rules/            # THE LAW — Engineering standards (7 files)
│   ├── skills/           # HOW — Role methodologies (7 files)
│   ├── commands/         # QUICK REF — Command cheat sheets (8 files)
│   └── GEMINI.md         # This file — Master control
│
└── tests/                # [Tester] - Test scripts & reports
```

---

## 📏 4. ENGINEERING RULES (Bộ quy chuẩn bắt buộc)
Tất cả roles phải tuân thủ các rules trong `.gemini/rules/`:

| Rule File | Nội dung | Áp dụng cho |
| :--- | :--- | :--- |
| `rules/api-convention.md` | RESTful API design, JSON envelope, status codes | BA, Dev, QC |
| `rules/code-style.md` | Go + TypeScript coding standards | Dev, QC |
| `rules/database.md` | UUID v7, migrations, query optimization | Dev, Architect, QC |
| `rules/error-handling.md` | Structured errors, tracing, zero-silence | Dev, QC |
| `rules/git-workflow.md` | Branching, commits, PR process, CI/CD | Dev, PM, DevOps, QC |
| `rules/testing.md` | TDD, coverage targets, test pyramid | Dev, Tester, QC |
| `rules/security.md` | Auth, IDOR, validation, CORS, secrets | Dev, DevOps, QC |

---

## 🏗️ 5. MA TRẬN PHỤ THUỘC (Interdependency Matrix)

| Vai trò | Phụ thuộc vào (Input) | Sản phẩm bàn giao (Output) | Ai đợi kết quả này? |
| :--- | :--- | :--- | :--- |
| **Architect** | Requirements (User/BA) | TDD, ADR, System Design | BA & Dev |
| **BA** | Yêu cầu từ User, TDD | Spec, Logic, AC | PM & Dev |
| **PM** | Spec của BA | ID Task & Priority (Registry) | Dev & Test |
| **Dev** | ID Task (PM) & Spec (BA) | Code, PR & Unit Test Pass | QC & Test |
| **QC** | Code của Dev | Kết quả Audit (Review) | PM & Dev (nếu reject) |
| **Test** | PR (Dev) & AC (BA) | Kết quả E2E (Pass/Fail) | PM & Dev (nếu bug) |
| **DevOps** | QC Sign-off | Deployment & Monitoring | PM & Stakeholder |

---

## 📝 6. QUY TẮC KÝ NHẬN (Task Sign-off Rules)
Một Task chỉ được coi là hoàn tất (**DONE**) khi cả 3 cột trong `REGISTRY.md` đạt trạng thái ✅:

1.  **[/dev] Hoàn thành code:** Tuân thủ `rules/` + `skills/SKILL_DEV.md`, đã có Migration (nếu cần).
2.  **[/test] Hoàn thành kiểm thử:** Tuân thủ `skills/SKILL_TESTER.md`. Nếu lỗi, tạo `BUG-xxx`.
3.  **[/qc] Duyệt cuối cùng:** Tuân thủ `skills/SKILL_QC.md`. Đổi Global Status thành **DONE**.

---

## 📜 7. KỶ LUẬT THÉP (Core Commandments)
1.  **No Spec, No Code:** `/dev` không tự ý viết code nếu chưa có ID trong Registry và Spec từ `/ba`.
2.  **Rules First:** Mọi code phải tuân thủ `.gemini/rules/`. Không có ngoại lệ.
3.  **Identity First:** Mọi giao tiếp API bắt buộc phải kèm theo Header `X-Device-ID`.
4.  **UUID v7 Only:** 100% Primary Key trong Database phải sử dụng định dạng UUID v7.
5.  **Targeted Patch:** Khi sửa lỗi, chỉ tác động đúng vùng được chỉ định.
6.  **Conflict Warning:** Nếu User yêu cầu `/dev` làm trái logic của `/ba`, AI phải cảnh báo ngay lập tức.
7.  **Dependency First:** Tuyệt đối tuân thủ Ma trận phụ thuộc. Không làm tắt, không bỏ bước.
8.  **Design Before Build:** Features lớn (≥2 layers) phải có TDD từ `/architect` trước khi code.

---

## 🐞 8. THEO DÕI LỖI (Bug Tracker)

| Bug ID | Liên quan | Mô tả lỗi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | API-005 | Gửi số lượng âm (-) vẫn nhận đơn hàng | High | Open |

---

## 🔄 9. ACTIVATION PROTOCOL
Khi 1 slash command được gọi:
1. Đọc `agents/AGENT_*.md` tương ứng → xác định persona + scope
2. Đọc `skills/SKILL_*.md` → nắm methodology cụ thể
3. Đọc `rules/` liên quan → tuân thủ engineering standards
4. Tham khảo `commands/*.md` → format output chuẩn
