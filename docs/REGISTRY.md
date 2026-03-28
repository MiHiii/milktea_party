# 📊 Milktea Party — Task Registry & Progress Tracking (v4.0)

**Project Status:** 🌀 **SPRINT 1 IN PROGRESS** | **Global Health:** ✅ All Systems Nominal
**Last Sync:** 2026-03-28T13:00 (Updated by /pm)

---

## 📁 1. SPEC DOCUMENTS INDEX
| Spec File | Covers | Mô tả |
|:---|:---|:---|
| [REQ-00003-order-management](specs/business/REQ-00003-order-management.md) | REQ-00003, 00007, 00008, 00015 | Multi-batch conversion, batch safety deletion |
| [TTD-00003-multi-batch](specs/tech/TTD-00003-multi-batch.md) | REQ-00003 | Multi-batch transition & migration logic |
| [REQ-00004-billing-settlement](specs/business/REQ-00004-billing-settlement.md) | REQ-00004, 00006, 00011, 00013, 00016 | Rounding, allocation, residual, VietQR |
| [TTD-00004-billing-engine](specs/tech/TTD-00004-billing-engine.md) | REQ-00004 | Billing engine proportional allocation logic |

---

## 🏗️ 2. CORE BUSINESS LOGIC (Nghiệp vụ cốt lõi)

| ID | REQ Ref | Sprint | Requirement / Logic | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **REQ-00001** | REQ-00001 | S1 | State Machine (6 trạng thái Session) | ✅ | ✅ | ✅ | `DONE` | |
| **REQ-00002** | REQ-00002 | S1 | DeviceID Identity & Heartbeat | ✅ | ✅ | ✅ | `DONE` | |
| **REQ-00003** | REQ-00003 | S1 | OrderBatch & Grouping Logic | ✅ | ✅ | ✅ | `DONE` | Multi-batch & Safety Deletion verified |
| **REQ-00004** | REQ-00004 | S1 | Math: Rounding 1k & Residuals | ⏳ | ⏳ | ⏳ | `READY_FOR_DEV` | **Next Priority** |
| **REQ-00020** | REQ-00020 | S1 | Host Recovery & Re-binding Logic | ✅ | ✅ | ✅ | `DONE` | |

---

## 🎨 3. FRONTEND MODULES (Giao diện & UX)

| ID | REQ Ref | Sprint | Feature / Component | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **FEAT-00002** | REQ-00003 | S1 | UI: Guest Order Form (Batch selection) | ✅ | ✅ | ✅ | `DONE` | |
| **FEAT-00021** | REQ-00003 | S1 | UI: Host Multi-batch Management | ✅ | ✅ | ✅ | `DONE` | Fee inputs & Safety Modals |

---

## 🔌 4. API ENDPOINTS (Backend Services)

| ID | REQ Ref | Sprint | Endpoint | Method | DEV | TEST | QC | Status | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **API-00007** | REQ-00003 | S1 | `/api/order-batches` (Create) | POST | ✅ | ✅ | ✅ | `DONE` | |
| **API-00017** | REQ-00003 | S1 | `/api/order-batches/session/:sid` | GET | ✅ | ✅ | ✅ | `DONE` | |
| **API-00018** | REQ-00003 | S1 | `/api/order-batches/:id` | PUT | ✅ | ✅ | ✅ | `DONE` | Supports ship/voucher |
| **API-00019** | REQ-00003 | S1 | `/api/order-batches/:id` | DELETE | ✅ | ✅ | ✅ | `DONE` | Item migration logic included |

---

## 🐞 7. BUG TRACKER (Phát hiện bởi Test/QC)

| Bug ID | Task | Sprint | Mô tả lỗi | Mức độ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-00022** | — | S1 | Nút password trong HostSettings không ấn được | Medium | Fixed | Đã map đúng props trong SessionClient |

---

## 📊 8. SPRINT DASHBOARD

### Sprint 1 — Summary
| Metric | Value |
|--------|-------|
| **Total Tasks** | 20 |
| **Done** | 19 |
| **In Progress** | 1 |
| **Backlog** | 0 |
| **Open Bugs** | 0 |

---
*Ghi chú quản lý: Multi-batch đã hoàn thành xuất sắc. Bắt đầu giai đoạn tính toán tài chính (REQ-00004).*
