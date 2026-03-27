# 📊 Milktea Party — Task Registry & Progress Tracking (v4.0)

**Project Status:** 🌀 **SPRINT 1 IN PROGRESS** | **Global Health:** ⚠️ 1 Bug Pending
**Last Sync:** 2026-03-27T00:00 (Updated by /pm)

> **Convention**: ID dùng 5 chữ số zero-padded (VD: `FEAT-00001`). Xem `skills/SKILL_PM.md` để biết rules.

---

## 📁 1. SPEC DOCUMENTS INDEX
> `/dev` đọc spec chi tiết trước khi code. Click link để mở.

| Spec File | Covers | Mô tả |
|:---|:---|:---|
| [REQ-00001-session-lifecycle](specs/business/REQ-00001-session-lifecycle.md) | REQ-00001, 00009, 00010, 00014, 00019 | State machine, password, multi-join, cancel, expiry |
| [REQ-00002-identity-participant](specs/business/REQ-00002-identity-participant.md) | REQ-00002, FEAT-00011 | DeviceID, heartbeat, online/offline status |
| [REQ-00003-order-management](specs/business/REQ-00003-order-management.md) | REQ-00003, 00007, 00008, 00015 | Batch, pay separate, idempotency, host permissions |
| [REQ-00004-billing-settlement](specs/business/REQ-00004-billing-settlement.md) | REQ-00004, 00006, 00011, 00013, 00016 | **CRITICAL:** Rounding, allocation, residual, VietQR, discount |
| [REQ-00005-realtime-sync](specs/business/REQ-00005-realtime-sync.md) | REQ-00005, 00012, 00017, 00018 | WebSocket, broadcasting, transactional ops |

### API Specification
> Khi file `api_overview.md` quá dài, BA tách thành các module trong `docs/specs/api/`:

| Spec Module | Covers | File |
|:---|:---|:---|
| Session API | Create, Get, Update Status, Delete | `docs/specs/api/session.md` |
| Participant API | Join, Leave, Heartbeat | `docs/specs/api/participant.md` |
| Order API | Items, Batches | `docs/specs/api/order.md` |
| **Settlement API** | **Calculate Bill (Critical)** | `docs/specs/api/API-00011-settlement.md` |

---

## 🏗️ 2. CORE BUSINESS LOGIC (Nghiệp vụ cốt lõi)

| ID | REQ Ref | Sprint | Requirement / Logic | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **REQ-00001** | REQ-00001 | S1 | State Machine (6 trạng thái Session) | ✅ | ✅ | ✅ | `DONE` | Đã vá IDOR & thêm FOR UPDATE |
| **REQ-00002** | REQ-00002 | S1 | DeviceID Identity & Heartbeat | ✅ | ✅ | 🏗️ | `IN_REVIEW` | Đang chờ QC Audit |
| **REQ-00003** | REQ-00003 | S1 | OrderBatch & Grouping Logic | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Chờ Tester chạy E2E |
| **REQ-00004** | REQ-00004 | S1 | Math: Rounding 1k & Residuals | ⏳ | ⏳ | 🏗️ | `IN_ANALYSIS` | **High Priority** - Cần BA spec |
| **REQ-00005** | REQ-00005 | S1 | Real-time Sync (WebSocket) | ✅ | 🏗️ | 🏗️ | `IN_PROGRESS` | Cần cơ chế Re-sync khi mất WS |
| **REQ-00009** | REQ-00009 | S1 | Session Password Protection | 🏗️ | ⏳ | 🏗️ | `IN_PROGRESS` | Cần chuyển sang bcrypt |

---

## 🎨 3. FRONTEND MODULES (Giao diện & UX)

| ID | REQ Ref | Sprint | Feature / Component | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **FEAT-00001** | — | S0 | UI: Host Dashboard | ✅ | ✅ | ✅ | `DONE` | Core Dashboard hoàn tất |
| **FEAT-00002** | — | S1 | UI: Guest Order Form | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Chờ E2E verification |
| **FEAT-00011** | REQ-00002 | S1 | UI: Participant Online Status | ✅ | ✅ | ✅ | `DONE` | Dot xanh/đỏ trạng thái & Heartbeat sync |
| **FEAT-00012** | REQ-00001 | S1 | UI: Dynamic Action Buttons | ✅ | ✅ | ✅ | `DONE` | Ẩn/hiện nút theo status |
| **FEAT-00013** | — | S1 | UI Hardening: Price Freeze & Sync | ⏳ | ⏳ | 🏗️ | `BACKLOG` | Khóa giá lúc SETTLING, báo mất mạng |

---

## 🔌 4. API ENDPOINTS (Backend Services)

| ID | REQ Ref | Sprint | Endpoint | Method | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **API-00001** | REQ-00001 | S0 | `/api/sessions` (Create) | POST | ✅ | ✅ | ✅ | `DONE` | |
| **API-00002** | REQ-00001 | S0 | `/api/sessions/slug/:slug` | GET | ✅ | ✅ | ✅ | `DONE` | |
| **API-00003** | REQ-00001 | S1 | `/api/sessions/:id` (Status) | ✅ | ✅ | ✅ | `DONE` | Bảo mật Host quyền Passed |
| **API-00004** | REQ-00002 | S1 | `/api/participants` (Join) | POST | ✅ | ✅ | 🏗️ | `IN_REVIEW` | Chờ QC duyệt Security |
| **API-00005** | REQ-00003 | S1 | `/api/order-items` (Add) | POST | ✅ | ❌ | ⏳ | `RE-OPEN` | **Fix BUG-00001** |
| **API-00022** | REQ-00001 | S1 | Session State (Validation) | — | ✅ | ✅ | ✅ | `DONE` | Added Transaction FOR UPDATE - QC Passed |

---

## 🏗️ 5. INFRASTRUCTURE & DEVOPS

| ID | REQ Ref | Sprint | Task | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **OPS-00001** | — | S0 | CI/CD Pipeline Setup | ✅ | ✅ | ✅ | `DONE` | GitHub Actions |
| **OPS-00002** | — | S1 | Staging Environment | ⏳ | ⏳ | ⏳ | `BACKLOG` | Railway / Docker |

---

## 📐 6. ARCHITECTURE & TECH DEBT

| ID | REQ Ref | Sprint | Task | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **REFAC-00001** | — | — | Refactor order service | ⏳ | ⏳ | ⏳ | `BACKLOG` | Split into sub-services |

---

## 🐞 7. BUG TRACKER (Phát hiện bởi Test/QC)

| Bug ID | Task | Sprint | Mô tả lỗi | Mức độ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-00001** | `API-00005` | S1 | Gửi số lượng âm (-) vẫn nhận món | **High** | Open | Dev đang fix theo logic mới |

---

## 📊 8. SPRINT DASHBOARD

### Sprint 1 — Summary
| Metric | Value |
|--------|-------|
| **Total Tasks** | 15 |
| **Done** | 7 |
| **In Progress** | 5 |
| **Backlog** | 3 |
| **Open Bugs** | 1 |
| **Velocity** | — (first sprint) |

### Status Legend
| Icon | Meaning |
|:----:|---------|
| ✅ | Completed |
| 🏗️ | In progress / Under review |
| ⏳ | Waiting / Not started |
| ❌ | Failed / Rejected |
| ⬜ | Not applicable yet |

---

*Ghi chú quản lý: /pm đã khóa Sprint 1. Mọi thay đổi ngoài danh sách trên phải đưa vào Backlog.*

