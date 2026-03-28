# 🏗️ TTD-00004: Billing Engine (Batch-aware) - v2.0

**Status:** `APPROVED` | **Owner:** /architect | **Date:** 2026-03-28
**Reference:** [REQ-00004 v1.2](docs/specs/business/REQ-00004-billing-settlement.md)

---

## 1. Tiền xử lý (Pre-processing)

Trước khi đi vào pipeline chính, hệ thống thực hiện chuẩn hóa dữ liệu:

### Bước 0: Tính giá trị tuyệt đối cho Discount (%)
- Nếu `is_split_batch = false` và `Session.DiscountType == 'percentage'`:
  - $T_{gross} = \sum (Price \times Qty)$ (tất cả món không `pay_separate`).
  - $Session.DiscountAmount = (T_{gross} \times Session.DiscountValue) / 100$.
- Làm tròn $DiscountAmount$ về số nguyên gần nhất.

---

## 2. Quy trình tính toán (Core Pipeline)

### Bước 1: Phân cụm (Grouping)
- Nhóm 0: `pay_separate = true`.
- Nhóm 1..N: Các món theo từng `OrderBatchID`.

### Bước 2: Tính nhóm "Thanh toán riêng" (Group 0)
- Với mỗi món $i$:
  - $P_{final} = Round1000(Price_i \times Qty_i)$.
  - $FeeShare = 0$.

### Bước 3: Tính toán từng Batch (Allocation)
Với mỗi Batch $B$ (Hoặc Session nếu không split):
1. $T_{base} = \sum (Price \times Qty)$ (chỉ các món không pay_separate trong Batch).
2. Chi phí Batch $C = B.ShippingFee - B.DiscountAmount$.
3. **Xử lý Chia cho 0 (Division by Zero):**
   - Nếu $T_{base} == 0$:
     - $Residual_B = C$ (Toàn bộ phí gánh bởi Host).
     - Với mọi món $i$: $FeeShare_i = 0$.
   - Nếu $T_{base} > 0$:
     - Với mỗi món $i$:
       - $ShareRatio = (Price_i \times Qty_i) / T_{base}$.
       - $P_{raw} = (Price_i \times Qty_i) + (C \times ShareRatio)$.
       - $P_{final} = Round1000(P_{raw})$.
       - $FeeShare = P_{final} - (Price_i \times Qty_i)$.
     - $Residual_B = (T_{base} + C) - \sum P_{final}$.

### Bước 4: Tổng hợp Participant Bill
- Duyệt qua danh sách Participant $P$:
  - $Subtotal_P = \sum P_{final}$ của tất cả các món người đó đã gọi.
  - Nếu $DeviceID == Session.HostDeviceID$:
    - $Adjustment = \sum Residual_B$.
    - $FinalAmount_P = Subtotal_P + Adjustment$.
  - Ngược lại:
    - $Adjustment = 0$.
    - $FinalAmount_P = Subtotal_P$.

---

## 3. API Specification

### Endpoint: `GET /api/sessions/:id/calculate`

**Response Shape:**
```json
{
  "data": {
    "sessionId": "uuid",
    "totalActual": 150000,
    "totalCalculated": 151000,
    "residual": 1000,
    "participants": [
      {
        "participantId": "uuid",
        "name": "Minh",
        "isHost": true,
        "subtotal": 45000,
        "adjustment": 1000,
        "finalAmount": 46000,
        "items": [
          {
            "itemId": "uuid",
            "itemName": "Trà sữa",
            "basePrice": 30000,
            "quantity": 1,
            "feeShare": 2000,
            "finalPrice": 32000
          }
        ]
      }
    ]
  }
}
```

---

## 4. Ràng buộc kỹ thuật (Technical Constraints)

1. **Precision:** Tất cả tính toán trung gian phải sử dụng `float64` cho tỷ lệ ($ShareRatio$) nhưng kết quả lưu trữ/trả về phải là `int64`.
2. **Persistence:** Kết quả tính toán là **Snapshot**. Khi Session chuyển sang trạng thái `SETTLING`, hệ thống sẽ tính toán 1 lần và trả về. Nếu dữ liệu món ăn thay đổi, API phải được gọi lại để cập nhật Snapshot.
3. **Application Logic:** Logic tính toán thực hiện hoàn toàn tại tầng Service trong Go để đảm bảo khả năng Unit Test.

---
*Bản thiết kế v2.0 đã tích hợp phản hồi từ BA và Dev.*
