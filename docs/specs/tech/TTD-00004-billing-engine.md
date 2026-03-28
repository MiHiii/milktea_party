# 🏗️ TTD-00004: Billing Engine (Batch-aware)

**Status:** `APPROVED` | **Owner:** /architect | **Date:** 2026-03-28
**Reference:** [REQ-00004 v1.2](docs/specs/business/REQ-00004-billing-settlement.md)

---

## 1. Quy trình tính toán (Core Pipeline)

Hệ thống thực hiện tính toán theo 5 bước nguyên tử:

### Bước 1: Phân cụm (Grouping)
- Nhóm 0: `pay_separate = true` (Toàn session).
- Nhóm 1..N: Các món theo từng `OrderBatchID` (Nếu `is_split_batch = true`).
- Nhóm Default: Các món không có Batch ID (Nếu `is_split_batch = false`).

### Bước 2: Tính nhóm "Thanh toán riêng"
- $P_{rounded} = floor((Price \times Qty + 500) / 1000) \times 1000$.
- Phí tham gia = 0.

### Bước 3: Tính toán từng Batch (Allocation)
Với mỗi Batch $B$:
1. $T_{base} = \sum Price \times Qty$ (chỉ các món không pay_separate trong Batch).
2. Chi phí Batch $C = B.ShippingFee - B.DiscountAmount$.
3. Với mỗi món $i$: 
   - $P_{raw} = (Price \times Qty) + (C \times \frac{Price \times Qty}{T_{base}})$
   - $P_{rounded} = Round1000(P_{raw})$
4. $Residual_B = (T_{base} + C) - \sum P_{rounded}$

### Bước 4: Tổng hợp Participant Bill
- Duyệt qua danh sách Participant.
- $Subtotal = \sum P_{rounded}$ của tất cả các món người đó đã gọi (trong mọi Batch).
- Nếu $DeviceID == Session.HostDeviceID$:
  - $FinalAmount = Subtotal + \sum Residual_B$
- Ngược lại:
  - $FinalAmount = Subtotal$

### Bước 5: Sinh QR
- Dùng VietQR API cho mỗi Participant dựa trên $FinalAmount$.

## 2. API Endpoint
`GET /api/sessions/:id/calculate`

---
*TTD này đã được Architect phê duyệt. /dev thực hiện triển khai.*
