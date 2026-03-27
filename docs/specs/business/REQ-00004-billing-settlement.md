# 📋 SPEC: Billing, Settlement & VietQR
> **Registry IDs:** REQ-004, REQ-006, REQ-011, REQ-013, REQ-016
> **Owner:** /ba | **Version:** 1.0 | **Date:** 2026-03-25
> **Depends on:** `milktea-logic.md` §1 (Math Engine), `api/settlement.md` (API-011)

---

## 1. Tổng quan

Spec quan trọng nhất — **cốt lõi tính tiền**. Bao gồm: làm tròn VNĐ, phân bổ voucher/ship, residual cho Host, discount engine, sinh VietQR.

---

## 2. REQ-004: Math Rounding 1k & Residuals

### Quy tắc
```
Round1000(x) = Math.round(x / 1000) * 1000
```
- 32.400 → 32.000 | 32.500 → 33.000 | 32.600 → 33.000

### Code cho /dev
```go
func Round1000(amount int64) int64 {
    return int64(math.Round(float64(amount)/1000.0)) * 1000
}
```
```typescript
const round1000 = (n: number) => Math.round(n / 1000) * 1000;
```

---

## 3. REQ-006: Voucher & Ship Allocation %

### Công thức (theo `milktea-logic.md` §1A)
```
V_i = (P_i / T_base) × D      // Voucher phân bổ
S_i = (P_i / T_base) × S      // Ship phân bổ
B_i = Round1000(P_i - V_i + S_i)  // Bill cá nhân
```
- `P_i` = price × quantity (item i)
- `T_base` = SUM(P_i) chỉ items `pay_separate = false`
- `D` = tổng discount, `S` = tổng ship

### Ví dụ tính toán

**Input:** Voucher=20.000 (fixed), Ship=15.000

| Người | P_i | Tỷ lệ | V_i | S_i | Raw Bill | Rounded |
|:---|---:|---:|---:|---:|---:|---:|
| Minh | 70.000 | 46.7% | -9.333 | +7.000 | 67.667 | 68.000 |
| Lan | 30.000 | 20.0% | -4.000 | +3.000 | 29.000 | 29.000 |
| Hùng | 50.000 | 33.3% | -6.667 | +5.000 | 48.333 | 48.000 |

T_base=150.000 → Actual=145.000 → Rounded total=145.000 → Residual=0

### Acceptance Criteria
```gherkin
Given ship=15.000, voucher=20.000, 3 items tổng 150.000
When gọi /calculate
Then SUM(discountAllocated)==20.000 AND SUM(shipAllocated)==15.000
And mỗi item phân bổ tỷ lệ với basePrice
```

---

## 4. REQ-016: Discount Engine (% & Fixed)

### Hai loại giảm giá
Model: `discount_type` = `"percentage"` | `"amount"`, `discount_value` = int64

```go
func calculateDiscount(discountType string, discountValue, totalBase int64) int64 {
    switch discountType {
    case "percentage":
        D := totalBase * discountValue / 100
        if D > totalBase { return totalBase }
        return D
    case "amount":
        if discountValue > totalBase { return totalBase }
        return discountValue
    default:
        return 0
    }
}
```

### Edge Cases
- % > 100 → Cap at T_base
- Fixed > T_base → D = T_base (bill = ship only)
- Value = 0 → Không phân bổ

---

## 5. REQ-011: Host Adjustment Logic (Residual)

### Vấn đề
Làm tròn gây chênh lệch. **Host gánh phần dư**.

```
A_host = Actual_Total - SUM(B_i)
Host.FinalAmount = Host.Subtotal + A_host
```

- `A_host > 0` → Host trả thêm (thiếu do làm tròn xuống)
- `A_host < 0` → Host được giảm (thừa do làm tròn lên)

### Acceptance Criteria
```gherkin
Given actualTotal=145.000, SUM(rounded)=146.000
Then residual=-1.000 AND Host.final = Host.subtotal - 1.000
```

---

## 6. REQ-013: VietQR Generation (Napas247)

### Cách sinh QR

Dùng VietQR API (đơn giản nhất):
```
https://img.vietqr.io/image/{BIN}-{ACCOUNT}-compact2.png?amount={AMOUNT}&addInfo={DESC}
```

### Code cho /dev

**Backend `pkg/vietqr/vietqr.go`:**
```go
var BankBINMap = map[string]string{
    "vietcombank": "970436", "techcombank": "970407",
    "mbbank": "970422",     "tpbank": "970423",
    "acb": "970416",        "vpbank": "970432",
    "bidv": "970418",       "agribank": "970405",
}

type QRInput struct {
    BankName, AccountNo string
    Amount int64
    Description string
}

func GenerateURL(input QRInput) string {
    bin := BankBINMap[strings.ToLower(input.BankName)]
    return fmt.Sprintf(
        "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s",
        bin, input.AccountNo, input.Amount, url.QueryEscape(input.Description),
    )
}
```

Nếu Session đã có `host_default_qr_payload` → dùng trực tiếp, chỉ thay amount.

### Acceptance Criteria
```gherkin
Given bank="vietcombank", account="1234567890", amount=45.000
When sinh QR
Then URL chứa BIN=970436, account, amount=45000
And QR quét được bằng app ngân hàng VN
```

---

## 7. Luồng tính toán tổng hợp

```
[1] Fetch session + items + participants
  ↓
[2] Tách pay_separate items ra riêng
  ↓
[3] T_base = SUM(P_i) items không pay_separate
  ↓
[4] D = calculateDiscount(type, value, T_base)     ← REQ-016
  ↓
[5] Actual = T_base - D + Ship
  ↓
[6] V_i, S_i → B_i = Round1000(P_i - V_i + S_i)   ← REQ-004, REQ-006
  ↓
[7] Group by participant → Subtotal
  ↓
[8] Residual → Host adjustment                      ← REQ-011
  ↓
[9] VietQR per participant                           ← REQ-013
  ↓
Output: BillResult
```

### Service cần tạo mới: `billing_service.go`

```go
type BillingService interface {
    Calculate(ctx context.Context, sessionID uuid.UUID) (*BillResult, error)
}

type BillResult struct {
    SessionID      uuid.UUID
    TotalBase      int64
    TotalDiscount  int64
    ShippingFee    int64
    ActualTotal    int64
    Residual       int64
    Participants   []ParticipantBill
}

type ParticipantBill struct {
    ParticipantID      uuid.UUID
    Name               string
    IsHost             bool
    Items              []BillItem
    Subtotal           int64
    ResidualAdjustment int64
    FinalAmount        int64
    IsPaid             bool
    QrPayload          string
}
```

---
*Spec này là nguồn chân lý cho /dev. Mọi thắc mắc liên hệ /ba.*
