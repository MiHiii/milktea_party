# 📊 Milktea Party - Task Registry & Progress Tracking (v3.1)

**Project Status:** 🛠️ IN_PROGRESS | **Global Health:** ⚠️ 1 Bug Pending
**Last Sync:** 2026-03-25T23:06 (Updated by /ba — Added Spec Links)

---

## 📁 Spec Documents Index
> `/dev` đọc spec chi tiết trước khi code. Click link để mở.

| Spec File | Covers | Mô tả |
|:---|:---|:---|
| [REQ-session-lifecycle](specs/REQ-session-lifecycle.md) | REQ-001, 009, 010, 014, 019 | State machine, password, multi-join, cancel, expiry |
| [REQ-identity-participant](specs/REQ-identity-participant.md) | REQ-002, FEAT-011 | DeviceID, heartbeat, online/offline status |
| [REQ-order-management](specs/REQ-order-management.md) | REQ-003, 007, 008, 015 | Batch, pay separate, idempotency, host permissions |
| [REQ-billing-settlement](specs/REQ-billing-settlement.md) | REQ-004, 006, 011, 013, 016 | **CRITICAL:** Rounding, allocation, residual, VietQR, discount |
| [REQ-realtime-sync](specs/REQ-realtime-sync.md) | REQ-005, 012, 017, 018 | WebSocket events, transactions, pessimistic lock, timeout |
| [FEAT-settlement-ui](specs/FEAT-settlement-ui.md) | FEAT-003, 007, 008 | QR screen, copy amount, host price update |
| [FEAT-ux-enhancement](specs/FEAT-ux-enhancement.md) | FEAT-004, 005, 006, 009, 010 | History, notifications, OG/Zalo, error handling, dialogs |

---

## 🏗️ 1. CORE BUSINESS LOGIC (Nghiệp vụ cốt lõi)
| ID | Requirement / Logic | Spec | DEV | TEST | QC | Global Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | State Machine (6 trạng thái Session) | [📄](specs/REQ-session-lifecycle.md#2-req-001-session-state-machine-6-trạng-thái) | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Lock/Unlock/Settle flow |
| **REQ-002** | DeviceID Identity & Heartbeat | [📄](specs/REQ-identity-participant.md#2-req-002-deviceid-identity--heartbeat) | ✅ | ✅ | 🏗️ | `IN_REVIEW` | Định danh Guest tin cậy |
| **REQ-003** | OrderBatch & Grouping Logic | [📄](specs/REQ-order-management.md#2-req-003-orderbatch--grouping-logic) | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Gom đơn theo đợt |
| **REQ-004** | Math: Rounding 1k & Residuals | [📄](specs/REQ-billing-settlement.md#2-req-004-math-rounding-1k--residuals) | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Làm tròn & Xử lý tiền lẻ |
| **REQ-005** | Real-time Sync (WebSocket) | [📄](specs/REQ-realtime-sync.md#1-req-005-real-time-sync-websocket) | ✅ | 🏗️ | 🏗️ | `IN_PROGRESS` | Đồng bộ trạng thái phòng |
| **REQ-006** | Voucher & Ship Allocation % | [📄](specs/REQ-billing-settlement.md#3-req-006-voucher--ship-allocation-) | 🏗️ | ⏳ | 🏗️ | `TODO` | Phân bổ giảm giá theo món |
| **REQ-007** | Pay Separate (Thanh toán riêng) | [📄](specs/REQ-order-management.md#3-req-007-pay-separate-thanh-toán-riêng) | 🏗️ | ⏳ | 🏗️ | `TODO` | Loại trừ món khỏi phí chung |
| **REQ-008** | Idempotency (Chống đặt trùng) | [📄](specs/REQ-order-management.md#4-req-008-idempotency-chống-đặt-trùng) | 🏗️ | ⏳ | 🏗️ | `TODO` | Bảo vệ API tạo đơn |
| **REQ-009** | Session Password Protection | [📄](specs/REQ-session-lifecycle.md#3-req-009-session-password-protection) | 🏗️ | ⏳ | 🏗️ | `TODO` | Đặt mật khẩu cho phòng |
| **REQ-010** | Multi-Join (Slug/UUID/URL) | [📄](specs/REQ-session-lifecycle.md#4-req-010-multi-join-slug--uuid--url) | 🏗️ | ⏳ | 🏗️ | `TODO` | Đa dạng cách vào phòng |
| **REQ-011** | Host Adjustment Logic ($A_{host}$) | [📄](specs/REQ-billing-settlement.md#5-req-011-host-adjustment-logic-residual) | 🏗️ | ⏳ | 🏗️ | `TODO` | Host gánh phần dư làm tròn |
| **REQ-012** | Transactional Financial Ops | [📄](specs/REQ-realtime-sync.md#2-req-012-transactional-financial-ops) | 🏗️ | ⏳ | 🏗️ | `TODO` | Đảm bảo tính nhất quán DB |
| **REQ-013** | VietQR Generation (Napas247) | [📄](specs/REQ-billing-settlement.md#6-req-013-vietqr-generation-napas247) | 🏗️ | ⏳ | 🏗️ | `TODO` | Sinh mã QR từ bank info Host |
| **REQ-014** | Session CANCELLED State | [📄](specs/REQ-session-lifecycle.md#5-req-014-session-cancelled-state) | 🏗️ | ⏳ | 🏗️ | `TODO` | Trạng thái hủy đơn hàng |
| **REQ-015** | Host: Edit/Delete Guest Items (LOCKED) | [📄](specs/REQ-order-management.md#5-req-015-host-editdelete-guest-items-khi-locked) | 🏗️ | ⏳ | 🏗️ | `TODO` | Quyền Host sửa/xóa món Guest khi LOCKED |
| **REQ-016** | Discount Calculation Engine (% & Fixed) | [📄](specs/REQ-billing-settlement.md#4-req-016-discount-engine---fixed) | 🏗️ | ⏳ | 🏗️ | `TODO` | Tính giảm giá kiểu % vs cố định VNĐ |
| **REQ-017** | Concurrent Update Prevention (Pessimistic Lock) | [📄](specs/REQ-realtime-sync.md#3-req-017-concurrent-update-prevention-pessimistic-lock) | 🏗️ | ⏳ | 🏗️ | `TODO` | `SELECT FOR UPDATE` khi chốt đơn |
| **REQ-018** | Context Timeout (3-5s) cho DB Ops | [📄](specs/REQ-realtime-sync.md#4-req-018-context-timeout-3-5s) | 🏗️ | ⏳ | 🏗️ | `TODO` | Guardrail timeout cho mọi DB call |
| **REQ-019** | Session Expiry / Auto-cleanup | [📄](specs/REQ-session-lifecycle.md#6-req-019-session-expiry--auto-cleanup) | 🏗️ | ⏳ | 🏗️ | `TODO` | TTL tự động đóng session cũ |

---

## 🎨 2. FRONTEND MODULES (Giao diện & UX)
| ID | Feature / Component | Spec | DEV | TEST | QC | Global Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | UI: Host Dashboard (Control Center) | — | ✅ | ✅ | ✅ | `DONE` | Toàn quyền cấu hình phòng |
| **FEAT-002** | UI: Guest Order Form | — | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Form đặt món & Xem bill cá nhân |
| **FEAT-003** | UI: QR Settlement Screen | [📄](specs/FEAT-settlement-ui.md#1-feat-003-qr-settlement-screen-critical) | 🏗️ | ⏳ | 🏗️ | `IN_PROGRESS` | **CRITICAL: Chia tiền & QR** |
| **FEAT-004** | UI: Session History | [📄](specs/FEAT-ux-enhancement.md#1-feat-004-session-history) | 🏗️ | ⏳ | 🏗️ | `TODO` | Xem lại các đơn cũ |
| **FEAT-005** | UI: Real-time Notifications | [📄](specs/FEAT-ux-enhancement.md#2-feat-005-real-time-notifications) | 🏗️ | ⏳ | 🏗️ | `TODO` | Thông báo khi Host chốt đơn |
| **FEAT-006** | UI: Open Graph / Zalo Share Preview | [📄](specs/FEAT-ux-enhancement.md#3-feat-006-open-graph--zalo-share-preview) | 🏗️ | ⏳ | 🏗️ | `TODO` | Thumbnail OG cho link chia sẻ Zalo |
| **FEAT-007** | UI: Copy Amount & Quick Actions | [📄](specs/FEAT-settlement-ui.md#2-feat-007-copy-amount--quick-actions) | 🏗️ | ⏳ | 🏗️ | `TODO` | Nút sao chép số tiền + QR shortcut |
| **FEAT-008** | UI: Host Price Update Form (ORDERED) | [📄](specs/FEAT-settlement-ui.md#3-feat-008-host-price-update-form-ordered) | 🏗️ | ⏳ | 🏗️ | `TODO` | Cập nhật giá thực tế từ quán |
| **FEAT-009** | UI: Error Boundary & Offline Handling | [📄](specs/FEAT-ux-enhancement.md#4-feat-009-error-boundary--offline-handling) | 🏗️ | ⏳ | 🏗️ | `TODO` | Xử lý lỗi mạng, Host offline |
| **FEAT-010** | UI: Host Confirmation Dialogs | [📄](specs/FEAT-ux-enhancement.md#5-feat-010-host-confirmation-dialogs) | 🏗️ | ⏳ | 🏗️ | `TODO` | Dialog xác nhận Lock/Delete/Cancel |
| **FEAT-011** | UI: Participant Online/Offline Status | [📄](specs/REQ-identity-participant.md#3-feat-011-ui-participant-onlineoffline-status) | 🏗️ | ⏳ | 🏗️ | `TODO` | Hiển thị dot xanh/đỏ trạng thái |

---

## 🔌 3. API ENDPOINTS (Backend Services)
| ID | Endpoint | Method | DEV | TEST | QC | Global Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-001** | `/api/sessions` (Create) | POST | ✅ | ✅ | ✅ | `DONE` | |
| **API-002** | `/api/sessions/slug/:slug` | GET | ✅ | ✅ | ✅ | `DONE` | |
| **API-003** | `/api/sessions/:id` (Status) | PUT | ✅ | ⏳ | 🏗️ | `IN_TESTING` | Lock/Unlock/Settle |
| **API-004** | `/api/participants` (Join) | POST | ✅ | ✅ | 🏗️ | `IN_REVIEW` | |
| **API-005** | `/api/order-items` (Add) | POST | ✅ | ❌ | ⏳ | `RE-OPEN` | **Fix BUG-001** |
| **API-006** | `/api/order-items/session/:id`| GET | ✅ | ✅ | ✅ | `DONE` | |
| **API-007** | `/api/order-batches` (Create) | POST | ✅ | ⏳ | 🏗️ | `IN_TESTING` | |
| **API-008** | `/api/participants/:id/heartbeat`| POST | 🏗️ | ⏳ | 🏗️ | `TODO` | Cập nhật Online status |
| **API-009** | `/api/sessions/slug/:slug/verify`| POST | 🏗️ | ⏳ | 🏗️ | `TODO` | Kiểm tra mật khẩu phòng |
| **API-010** | `/api/sessions/batch` | GET | 🏗️ | ⏳ | 🏗️ | `TODO` | Danh sách đơn theo đợt |
| **API-011** | `/api/sessions/:id/calculate` | GET | 🏗️ | ⏳ | 🏗️ | `TODO` | **CRITICAL:** [Spec](specs/REQ-billing-settlement.md#7-luồng-tính-toán-tổng-hợp) |
| **API-012** | `/api/sessions/:id` (Delete) | DELETE | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, chưa test/QC |
| **API-013** | `/api/sessions` (List by Host) | GET | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, dùng cho History |
| **API-014** | `/api/order-items/:id` (Update) | PUT | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, Guest sửa món |
| **API-015** | `/api/order-items/:id` (Delete) | DELETE | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, Guest xóa món |
| **API-016** | `/api/sessions/:id` (Get by ID) | GET | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, lấy chi tiết session |
| **API-017** | `/api/order-batches/session/:sid` | GET | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, list batch |
| **API-018** | `/api/order-batches/:id` (Update) | PUT | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, sửa batch info |
| **API-019** | `/api/order-batches/:id` (Delete) | DELETE | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, xóa batch |
| **API-020** | `/api/participants/session/:sid` | GET | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, list participants |
| **API-021** | `/api/sessions/:id` (Update config) | PUT | ✅ | ⏳ | 🏗️ | `TODO` | Đã có code, cập nhật cấu hình session |

---

## 🐞 4. BUG TRACKER (Phát hiện bởi Test/QC)
| Bug ID | Task | Mô tả lỗi | Mức độ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | `API-005` | Gửi số lượng âm (-) vẫn nhận đơn hàng | **High** | Open | [Fix trong spec](specs/REQ-order-management.md#6-validation-rules-bug-001-fix) |

---
*Ghi chú quản lý: Cột DEV/TEST/QC chỉ được đánh dấu ✅ khi pass qua skill tương ứng.*
