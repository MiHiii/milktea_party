# 🧮 API-00011: Calculate Bill — Đặc tả chi tiết

> **Endpoint:** `GET /api/sessions/:id/calculate`
> **Mô tả:** Tính toán bill cuối cùng cho toàn bộ Session, áp dụng Math Engine từ `milktea-logic.md` v4.0.
> **Khi nào gọi:** Khi Session chuyển sang trạng thái `SETTLING` hoặc khi Host cần preview bill.
> **Header bắt buộc:** `X-Device-ID`

### Request
```
GET /api/v1/sessions/{session_id}/calculate
```
Không cần body. Tất cả dữ liệu lấy từ DB dựa theo `session_id`.

### Response (200 OK)
```json
{
  "sessionId": "uuid-v7",
  "status": "SETTLING",
  "totalBasePrice": 250000,
  "totalDiscount": 30000,
  "discountType": "percentage",
  "discountValue": 10,
  "shippingFee": 25000,
  "actualTotal": 245000,
  "roundedTotal": 245000,
  "residual": 0,
  "participants": [
    {
      "participantId": "uuid-v7",
      "name": "Minh",
      "isHost": true,
      "items": [
        {
          "itemId": "uuid-v7",
          "itemName": "Trà sữa trân châu",
          "price": 35000,
          "quantity": 2,
          "basePrice": 70000,
          "discountAllocated": 8400,
          "shipAllocated": 7000,
          "paySeparate": false
        }
      ],
      "subtotal": 68600,
      "rounded": 69000,
      "residualAdjustment": -1000,
      "finalAmount": 68000,
      "isPaid": false,
      "qrPayload": "napas247://..."
    },
    {
      "participantId": "uuid-v7",
      "name": "Lan",
      "isHost": false,
      "items": [...],
      "subtotal": 45000,
      "rounded": 45000,
      "residualAdjustment": 0,
      "finalAmount": 45000,
      "isPaid": false,
      "qrPayload": "napas247://..."
    }
  ]
}
```

### Luồng tính toán (Algorithm)
Tuân thủ `milktea-logic.md` §1:

1. **Lọc items:** Tách `pay_separate = true` ra riêng (không tham gia phân bổ).
2. **$T_{base}$** = `SUM(price * quantity)` của các món `pay_separate = false`.
3. **$V_i$** (Voucher phân bổ) = `(P_i / T_base) * D` — với `D` là tổng discount.
4. **$S_i$** (Ship phân bổ) = `(P_i / T_base) * S` — với `S` là tổng shipping_fee.
5. **$B_i$** (Bill cá nhân) = `Round1000(P_i - V_i + S_i)`.
6. **$A_{host}$** (Residual) = `Actual_Total - SUM(B_i)` → cộng/trừ vào Host.

### Error Codes
| HTTP | Code | Mô tả |
| :--- | :--- | :--- |
| 404 | `SESSION_NOT_FOUND` | Session không tồn tại |
| 409 | `INVALID_STATE` | Session chưa ở trạng thái cho phép tính bill (phải ≥ LOCKED) |
| 422 | `NO_ORDER_ITEMS` | Session không có món nào để tính |

### Acceptance Criteria (Gherkin)
```gherkin
Given một Session ở trạng thái "SETTLING" với 3 participants và 5 món
When Host gọi GET /api/sessions/:id/calculate
Then response trả về danh sách participants với finalAmount đã làm tròn 1000đ
And SUM(finalAmount) == actualTotal (tổng hóa đơn thực tế)
And phần residual được cộng/trừ vào bill của Host
```


