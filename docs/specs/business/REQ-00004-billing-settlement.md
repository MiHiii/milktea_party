# 📋 SPEC: Billing, Settlement & VietQR
> **Registry IDs:** REQ-00004, REQ-00006, REQ-00011, REQ-00013, REQ-00016
> **Owner:** /ba | **Version:** 1.2 | **Date:** 2026-03-28
> **Depends on:** `REQ-00003` (Multi-batch), `TTD-00004` (Math Engine)

---

## 1. REQ-00004: Quy tắc làm tròn (The 1k Rule)
Toàn bộ bill cá nhân phải kết thúc bằng `000`.
- Công thức: `Round1000(x) = floor((x + 500) / 1000) * 1000`
- Áp dụng cho: Mọi món ăn (kể cả món thanh toán riêng) và Bill tổng của Participant.

---

## 2. REQ-00006: Phân bổ chi phí theo Batch (Precedence)

### 2.1 Luồng ưu tiên chi phí
1. **Nếu Session.is_split_batch = true:**
   - Chỉ lấy `discount_amount` và `shipping_fee` từ bảng `order_batches`.
   - Bỏ qua (Ignore) các field phí tại bảng `sessions`.
2. **Nếu Session.is_split_batch = false:**
   - Lấy `discount_value` và `shipping_fee` từ bảng `sessions`.

### 2.2 Cơ chế "Thanh toán riêng" (Pay Separate)
- **Checkbox UI:** "Thanh toán riêng (Không chia ship/voucher)"
- **Logic:**
  - $P_{final} = Round1000(Price \times Quantity)$
  - Món này **không** đóng góp vào $T_{base}$ của Batch/Session.
  - Món này **không** gánh bất kỳ đồng phí Ship nào và **không** được hưởng Voucher.

---

## 3. REQ-00011: Xử lý tiền lẻ (Residual Aggregate)

### 3.1 Host-as-Buffer
- Tiền lẻ thừa/thiếu do làm tròn (Residual) được tính **trên từng đơn vị phân bổ** (Session hoặc Batch).
- **Công thức:** `Residual = Actual_Total_Payable - Sum(Individual_Rounded_Bills)`
- **Tổng hợp:** 
  - Host gánh `Total_Residual = Sum(Residual_Batch_i)`.
  - Nếu có món không thuộc Batch, Residual của Session cũng cộng vào đây.

---

## 4. UI/UX Text Standard
- **Món riêng:** `[Thanh toán riêng]` - Màu Text: White/40 (Mờ).
- **Món chung:** Hiển thị giá đã bao gồm phí (VD: `32.000đ` thay vì `30.000đ`).
- **Bill Host:** Hiển thị thêm dòng: `"Bù trừ làm tròn: [+/-] X.000đ"`.

---
*Spec này đã đồng bộ với REQ-00003. Mời /architect thẩm định.*
