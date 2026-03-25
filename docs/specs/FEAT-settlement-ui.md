# 📋 SPEC: Settlement UI & Payment UX
> **Registry IDs:** FEAT-003, FEAT-007, FEAT-008
> **Owner:** /ba | **Version:** 1.0 | **Date:** 2026-03-25
> **Depends on:** `REQ-billing-settlement.md` (REQ-004,006,011,013,016)

---

## 1. FEAT-003: QR Settlement Screen (CRITICAL)

### 1.1 Mô tả
Màn hình thanh toán hiển thị sau khi Session chuyển sang `SETTLING`. Mục đích: cho từng Guest biết số tiền cần trả + mã QR để chuyển khoản nhanh.

### 1.2 Wireframe

**Góc nhìn Guest:**
```
┌──────────────────────────────────┐
│ 🧋 Milktea Party — Thu tiền     │
│ Phòng: "Trà chiều thứ 6"        │
├──────────────────────────────────┤
│                                  │
│ 💰 Bạn cần trả:                 │
│ ┌──────────────────────────────┐ │
│ │     45.000 đ                 │ │
│ │     [📋 Sao chép số tiền]    │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌─────────────────┐              │
│ │   ┌──────────┐  │              │
│ │   │  QR CODE  │  │              │
│ │   │           │  │              │
│ │   └──────────┘  │              │
│ │ Vietcombank     │              │
│ │ 1234567890      │              │
│ └─────────────────┘              │
│                                  │
│ 📝 Chi tiết đơn của bạn:        │
│ ├ Trà sữa trân châu ×2  70.000  │
│ │   Giảm giá:           -9.333  │
│ │   Phí ship:           +7.000  │
│ │   Sau làm tròn:       68.000  │
│ ├ (Residual Host):      -1.000  │
│ └────────────────────────        │
│ Tổng phải trả:    ▶ 45.000 đ    │
│                                  │
│ [✅ Đã chuyển khoản rồi!]       │
└──────────────────────────────────┘
```

**Góc nhìn Host:**
```
┌──────────────────────────────────┐
│ 🧋 Dashboard Thu tiền           │
├──────────────────────────────────┤
│ Tổng hóa đơn: 145.000đ          │
│ Đã thu:        45.000đ  (31%)   │
│ Còn thiếu:    100.000đ           │
│ ▓▓▓▓▓░░░░░░░░░░░ 31%           │
├──────────────────────────────────┤
│ 👥 Thành viên:                   │
│ ✅ Lan      — 45.000đ  ĐÃ TRẢ  │
│ ⏳ Hùng     — 48.000đ  CHƯA TRẢ │
│ 👑 Minh(bạn) — 52.000đ          │
├──────────────────────────────────┤
│ [Đánh dấu tất cả đã trả]       │
│ [Hoàn tất → COMPLETED]          │
└──────────────────────────────────┘
```

### 1.3 API cần gọi
- `GET /api/sessions/:id/calculate` (API-011) → Lấy bill result
- `PUT /api/participants/:id` → Cập nhật `is_paid = true`

### 1.4 Acceptance Criteria
```gherkin
Given Session ở trạng thái SETTLING
When Guest mở trang phòng
Then hiện màn hình QR với số tiền chính xác (đã làm tròn 1000đ)
And QR code chứa đúng thông tin bank + amount

Given Host xem dashboard thu tiền
When 2/3 Guest đã đánh dấu "Đã trả"
Then progress bar hiện 66%
And hiện danh sách ai đã/chưa trả
```

---

## 2. FEAT-007: Copy Amount & Quick Actions

### 2.1 Mô tả
Nút tiện ích giúp Guest copy nhanh số tiền để paste vào app ngân hàng.

### 2.2 Các Quick Actions

| Nút | Hành động | UX |
|:---|:---|:---|
| 📋 **Sao chép số tiền** | Copy `45000` vào clipboard | Toast "Đã sao chép 45.000đ" |
| 📱 **Mở app ngân hàng** | Deep link tới app bank (nếu có) | Fallback: copy STK |
| 💾 **Tải QR** | Download QR code dạng PNG | Lưu vào gallery |

### 2.3 Code cho /dev (Frontend)

```typescript
async function copyAmount(amount: number) {
  await navigator.clipboard.writeText(amount.toString());
  toast.success(`Đã sao chép ${amount.toLocaleString('vi-VN')}đ`);
}

async function downloadQR(qrUrl: string, participantName: string) {
  const response = await fetch(qrUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `milktea-${participantName}.png`;
  a.click();
}
```

### 2.4 Acceptance Criteria
```gherkin
Given Guest Lan thấy số tiền 45.000đ
When bấm "Sao chép số tiền"
Then clipboard chứa "45000"
And hiện toast thông báo đã copy

Given Guest thấy mã QR trên điện thoại
When bấm "Tải QR"
Then ảnh QR được download dạng PNG
```

---

## 3. FEAT-008: Host Price Update Form (ORDERED)

### 3.1 Mô tả
Khi session chuyển sang ORDERED, Host cần cập nhật giá thực tế từ quán (do quán đổi giá, hết voucher, ship tăng...).

### 3.2 Wireframe

```
┌──────────────────────────────────┐
│ 🔄 Cập nhật giá thực tế         │
├──────────────────────────────────┤
│ Phí ship mới:                    │
│ [______25.000_____] đ            │
│                                  │
│ Giảm giá mới:                    │
│ (●) Cố định [___20.000___] đ    │
│ (○) Phần trăm [____%] %         │
│                                  │
│ 📋 Danh sách món (sửa giá):     │
│ ├ Trà sữa   [35.000] → [37.000]│
│ ├ Cà phê     [30.000] → [30.000]│
│ └ Matcha     [50.000] → [55.000]│
│                                  │
│ [💾 Lưu & Tính lại bill]        │
│ [➡️ Chuyển sang Thu tiền]       │
└──────────────────────────────────┘
```

### 3.3 API calls flow

1. **Sửa ship/voucher:** `PUT /api/sessions/:id` (API-021) — body: `{ shippingFee, discountType, discountValue }`
2. **Sửa giá từng món:** `PUT /api/order-items/:id` (API-014) — body: `{ price }`
3. **Preview bill:** `GET /api/sessions/:id/calculate` (API-011)
4. **Chuyển trạng thái:** `PUT /api/sessions/:id` — body: `{ status: "settling" }`

### 3.4 Acceptance Criteria
```gherkin
Given Session ORDERED, giá trà sữa trên Grab = 37.000 (thay vì 35.000)
When Host nhập giá mới 37.000 và bấm "Lưu"
Then giá cập nhật thành công
And bill preview tính lại dựa trên giá mới

Given Host đã cập nhật xong giá
When bấm "Chuyển sang Thu tiền"
Then session chuyển SETTLING
And tất cả Guest nhận WS event với bill mới
```

---
*Spec này là nguồn chân lý cho /dev. Mọi thắc mắc liên hệ /ba.*
