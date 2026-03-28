# 📊 Milktea Party — Task Registry & Progress Tracking (v4.0)

**Project Status:** 🌀 **SPRINT 1 IN PROGRESS** | **Global Health:** ⚠️ 1 Bug Pending
**Last Sync:** 2026-03-28T11:00 (Updated by /pm)

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
| [TTD-00020-host-recovery](specs/tech/TTD-00020-host-recovery.md) | REQ-00020 | **NEW:** Host Recovery & Admin Secret Design |

### API Specification
---

## 🏗️ 2. CORE BUSINESS LOGIC (Nghiệp vụ cốt lõi)

| ID | REQ Ref | Sprint | Requirement / Logic | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **REQ-00001** | REQ-00001 | S1 | State Machine (6 trạng thái Session) | ✅ | ✅ | ✅ | `DONE` | Đã vá IDOR & thêm FOR UPDATE |
| **REQ-00002** | REQ-00002 | S1 | DeviceID Identity & Heartbeat | ✅ | ✅ | ✅ | `DONE` | FIXED: Heartbeat IDOR & naming |
| **REQ-00003** | REQ-00003 | S1 | OrderBatch & Grouping Logic | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Chờ Tester chạy E2E |
| **REQ-00004** | REQ-00004 | S1 | Math: Rounding 1k & Residuals | ⏳ | ⏳ | 🏗️ | `IN_ANALYSIS` | **High Priority** - Cần BA spec |
| **REQ-00005** | REQ-00005 | S1 | Real-time Sync (WebSocket) | ✅ | 🏗️ | 🏗️ | `IN_PROGRESS` | Cần cơ chế Re-sync khi mất WS |
| **REQ-00009** | REQ-00009 | S1 | Session Password Protection | 🏗️ | ⏳ | 🏗️ | `IN_PROGRESS` | Cần chuyển sang bcrypt |
| **REQ-00020** | REQ-00020 | S1 | Host Recovery & Re-binding Logic | ✅ | ✅ | ✅ | `DONE` | 2-min Grace Period & Rate Limit 3/hr |

---

## 🎨 3. FRONTEND MODULES (Giao diện & UX)

| ID | REQ Ref | Sprint | Feature / Component | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **FEAT-00001** | — | S0 | UI: Host Dashboard | ✅ | ✅ | ✅ | `DONE` | Core Dashboard hoàn tất |
| **FEAT-00002** | — | S1 | UI: Guest Order Form | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Chờ E2E verification |
| **FEAT-00011** | REQ-00002 | S1 | UI: Participant Online Status | ✅ | ✅ | ✅ | `DONE` | Dot xanh/đỏ trạng thái & Heartbeat sync |
| **FEAT-00012** | REQ-00001 | S1 | UI: Dynamic Action Buttons | ✅ | ✅ | ✅ | `DONE` | Ẩn/hiện nút theo status |
| **FEAT-00013** | — | S1 | UI Hardening: Price Freeze & Sync | ⏳ | ⏳ | 🏗️ | `BACKLOG` | Khóa giá lúc SETTLING, báo mất mạng |
| **FEAT-00020** | REQ-00020 | S1 | UI: Admin Secret Banner & Recovery | ✅ | ✅ | ✅ | `DONE` | Banner, Toast & Modal khôi phục |

---

## 🔌 4. API ENDPOINTS (Backend Services)

| ID | REQ Ref | Sprint | Endpoint | Method | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **API-00001** | REQ-00001 | S0 | `/api/sessions` (Create) | POST | ✅ | ✅ | ✅ | `DONE` | |
| **API-00002** | REQ-00001 | S0 | `/api/sessions/slug/:slug` | GET | ✅ | ✅ | ✅ | `DONE` | |
| **API-00003** | REQ-00001 | S1 | `/api/sessions/:id` (Status) | ✅ | ✅ | ✅ | `DONE` | Bảo mật Host quyền Passed |
| **API-00004** | REQ-00002 | S1 | `/api/participants` (Join) | POST | ✅ | ✅ | ✅ | `DONE` | FIXED: Response shape & naming |
| **API-00005** | REQ-00003 | S1 | `/api/order-items` (Add) | POST | ✅ | ✅ | ✅ | `DONE` | FIXED: IDOR & convention |
| **API-00022** | REQ-00001 | S1 | Session State (Validation) | — | ✅ | ✅ | ✅ | `DONE` | Added Transaction FOR UPDATE - QC Passed |
| **API-00023** | REQ-00020 | S1 | Create Session (Return secret) | POST | ✅ | ✅ | ✅ | `DONE` | Migration & Hashing logic |
| **API-00024** | REQ-00020 | S1 | `/api/sessions/slug/:slug/claim-host` | POST | ✅ | ✅ | ✅ | `DONE` | Heartbeat & Re-binding logic |

---

## 🐞 7. BUG TRACKER (Phát hiện bởi Test/QC)

| Bug ID | Task | Sprint | Mô tả lỗi | Mức độ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-00001** | `API-00005` | S1 | Gửi số lượng âm (-) vẫn nhận món | **High** | Fixed | Đã thêm validation ở Service & Gin Binding |

---

## 📊 8. SPRINT DASHBOARD

### Sprint 1 — Summary
| Metric | Value |
|--------|-------|
| **Total Tasks** | 19 |
| **Done** | 15 |
| **In Progress** | 3 |
| **Backlog** | 1 |
| **Open Bugs** | 0 |
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
