# 📊 Milktea Party - Task Registry & Progress Tracking (v3.3)

**Project Status:** 🌀 **SPRINT 1 IN PROGRESS** | **Global Health:** ⚠️ 1 Bug Pending
**Last Sync:** 2026-03-26T12:00 (Updated by /pm — Agile & Dependency Sync)

---

## 📁 Spec Documents Index
> `/dev` đọc spec chi tiết trước khi code. Click link để mở.

| Spec File | Covers | Mô tả |
|:---|:---|:---|
| [REQ-session-lifecycle](specs/REQ-session-lifecycle.md) | REQ-001, 009, 010, 014, 019 | State machine, password, multi-join, cancel, expiry |
| [REQ-identity-participant](specs/REQ-identity-participant.md) | REQ-002, FEAT-011 | DeviceID, heartbeat, online/offline status |
| [REQ-order-management](specs/REQ-order-management.md) | REQ-003, 007, 008, 015 | Batch, pay separate, idempotency, host permissions |
| [REQ-billing-settlement](specs/REQ-billing-settlement.md) | REQ-004, 006, 011, 013, 016 | **CRITICAL:** Rounding, allocation, residual, VietQR, discount |

---

## 🏗️ 1. CORE BUSINESS LOGIC (Nghiệp vụ cốt lõi)
| ID | REQ Ref | Sprint | Requirement / Logic | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | REQ-001 | S1 | State Machine (6 trạng thái Session) | 🏗️ | ⏳ | 🏗️ | `IN_PROGRESS` | Cần validation & Pessimistic Lock |
| **REQ-002** | REQ-002 | S1 | DeviceID Identity & Heartbeat | ✅ | ✅ | 🏗️ | `IN_REVIEW` | Đang chờ QC Audit |
| **REQ-003** | REQ-003 | S1 | OrderBatch & Grouping Logic | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Chờ Tester chạy E2E |
| **REQ-004** | REQ-004 | S1 | Math: Rounding 1k & Residuals | ⏳ | ⏳ | 🏗️ | `IN_ANALYSIS` | **High Priority** - Cần BA spec |
| **REQ-005** | REQ-005 | S1 | Real-time Sync (WebSocket) | ✅ | 🏗️ | 🏗️ | `IN_PROGRESS` | Cần cơ chế Re-sync khi mất WS |
| **REQ-009** | REQ-009 | S1 | Session Password Protection | 🏗️ | ⏳ | 🏗️ | `IN_PROGRESS` | Cần chuyển sang bcrypt |

---

## 🎨 2. FRONTEND MODULES (Giao diện & UX)
| ID | REQ Ref | Sprint | Feature / Component | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | — | S0 | UI: Host Dashboard | ✅ | ✅ | ✅ | `DONE` | Core Dashboard hoàn tất |
| **FEAT-002** | — | S1 | UI: Guest Order Form | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Chờ E2E verification |
| **FEAT-011** | REQ-002 | S1 | UI: Participant Online Status | ✅ | ✅ | ✅ | `DONE` | Dot xanh/đỏ trạng thái & Heartbeat sync |
| **FEAT-012** | REQ-001 | S1 | UI: Dynamic Action Buttons | ✅ | ✅ | ✅ | `DONE` | Ẩn/hiện nút theo status |
| **FEAT-013** | — | S1 | UI Hardening: Price Freeze & Sync | ⏳ | ⏳ | 🏗️ | `BACKLOG` | Khóa giá lúc SETTLING, báo mất mạng |

---

## 🔌 3. API ENDPOINTS (Backend Services)
| ID | REQ Ref | Sprint | Endpoint | Method | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-001** | REQ-001 | S0 | `/api/sessions` (Create) | ✅ | ✅ | ✅ | `DONE` | |
| **API-002** | REQ-001 | S0 | `/api/sessions/slug/:slug` | GET | ✅ | ✅ | ✅ | `DONE` | |
| **API-003** | REQ-001 | S1 | `/api/sessions/:id` (Status) | PUT | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Chờ test transition logic |
| **API-004** | REQ-002 | S1 | `/api/participants` (Join) | POST | ✅ | ✅ | 🏗️ | `IN_REVIEW` | Chờ QC duyệt Security |
| **API-005** | REQ-003 | S1 | `/api/order-items` (Add) | POST | ✅ | ❌ | ⏳ | `RE-OPEN` | **Fix BUG-001** |
| **API-022** | REQ-001 | S1 | Session State (Validation) | ✅ | ✅ | ✅ | `DONE` | Added Transaction for FOR UPDATE - QC Passed |

---

## 🐞 4. BUG TRACKER (Phát hiện bởi Test/QC)
| Bug ID | Task | Sprint | Mô tả lỗi | Mức độ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | `API-005` | S1 | Gửi số lượng âm (-) vẫn nhận món | **High** | Open | Dev đang fix theo logic mới |

---
*Ghi chú quản lý: /pm đã khóa Sprint 1. Mọi thay đổi ngoài danh sách trên phải đưa vào Backlog.*
