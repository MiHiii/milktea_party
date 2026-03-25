# 🧋 Milktea Party — Core Business Logic & Math Engine (v4.0)

Tài liệu này quy định các thuật toán, công thức tính toán và luồng xử lý nghiệp vụ của hệ thống. Đây là "Luật chơi" mà Backend và Frontend phải tuân thủ tuyệt đối.

---

## 🏗️ 1. MATH ENGINE (Cơ chế tính toán)

Hệ thống sử dụng cơ chế **Recalculate on Demand** (Tính toán lại từ đầu danh sách món) để đảm bảo tính chính xác 100%.

### A. Công thức tính toán (The Formulas)
Mọi biến số phải được định nghĩa rõ ràng:
1.  **Item Base Price ($P_i$):** `Price * Quantity`.
2.  **Total Base Price ($T_{base}$):** $\sum P_i$ (Chỉ tính các món có `pay_separate = false`).
3.  **Phân bổ Voucher ($V_i$):** 
    - Nếu tổng Voucher giảm giá là $D$: $V_i = (P_i / T_{base}) * D$.
4.  **Phân bổ Phí Ship ($S_i$):** 
    - Nếu tổng phí ship là $S$: $S_i = (P_i / T_{base}) * S$.
5.  **Hóa đơn cá nhân cuối cùng ($B_i$):** `Round1000(P_i - V_i + S_i)`.
    - *Chú thích:* Mọi Bill cá nhân phải được làm tròn về **1.000 VNĐ** gần nhất.
6.  **Điều chỉnh dư thừa của Host ($A_{host}$):** `Tổng_Hóa_Đơn_Thực_Tế - \sum B_i`.
    - Phần chênh lệch do làm tròn (Residual) sẽ được cộng/trừ trực tiếp vào hóa đơn của Host để đảm bảo tổng thu về khớp 100% với hóa đơn quán.

---

## 🔄 2. SESSION STATE MACHINE (Máy trạng thái)

Việc chuyển đổi trạng thái Session phải tuân thủ ma trận quyền hạn sau:

| Trạng thái | Guest: Thêm/Sửa/Xóa | Host: Sửa giá/Phí | Chuyển trạng thái sang |
| :--- | :--- | :--- | :--- |
| **OPEN** | ✅ Cho phép | ✅ Cho phép | -> **LOCKED** / **CANCELLED** |
| **LOCKED** | ❌ Chặn đứng | ✅ Cho phép | -> **ORDERED** / **OPEN** / **CANCELLED** |
| **ORDERED** | ❌ Chặn đứng | ✅ Cập nhật giá thực tế | -> **SETTLING** |
| **SETTLING** | ❌ Chặn đứng | ❌ Chặn đứng | -> **COMPLETED** |
| **COMPLETED** | ❌ Chặn đứng | ❌ Chặn đứng | (Kết thúc - Lưu lịch sử) |
| **CANCELLED** | ❌ Chặn đứng | ❌ Chặn đứng | (Kết thúc - Hủy đơn, thông báo Guest qua WS) |

---

## 🔒 3. RELIABILITY & DATA INTEGRITY (Kỷ luật dữ liệu)

1. **Idempotency (Safety Net):** Mọi request thay đổi dữ liệu phải gửi kèm `Idempotency-Key` (UUID) để tránh thao tác trùng lặp khi mạng lag.
2. **Pessimistic Locking:** Sử dụng `SELECT ... FOR UPDATE` trong Transaction khi Host thực hiện "Chốt đơn" để tránh các thay đổi đồng thời từ Guest.
3. **Validation Rule:** Dữ liệu từ Client phải đi qua **Zod Schema** trước khi xử lý. Không tin tưởng bất kỳ input nào.

---

## 🔌 4. OPERATIONS LOGIC

### A. Order Batching Strategy
- Khi bật **CHIA ĐƠN**: Hệ thống tự động tạo một Batch mặc định và di chuyển toàn bộ các món hiện tại vào đó.
- Các món thuộc Batch khác nhau sẽ được gom nhóm để tạo các mã QR thanh toán riêng biệt (nếu cấu hình).

### B. Pay Separate (Thanh toán riêng)
- Nếu một món được đánh dấu `pay_separate = true`: 
  - Món này sẽ **không tham gia** vào việc phân bổ Phí Ship/Voucher chung của phòng.
  - Sẽ có mã QR riêng biệt và không nằm trong Bill Batch của nhóm.

---

## ⚠️ Coding Guardrails
- **Transaction-First:** Mọi thay đổi liên quan đến tiền bạc/trạng thái bắt buộc nằm trong Transaction.
- **Context Timeout:** Áp dụng `context.WithTimeout (3-5s)` cho mọi thao tác Database.
- **Rounding Rule:** `32.400đ` -> `32.000đ`; `32.600đ` -> `33.000đ`.

---
> **Lưu ý cho /dev:** Đây là linh hồn của ứng dụng. Bất kỳ sự sai lệch nào trong logic tính toán đều bị coi là lỗi nghiêm trọng (Critical Bug).