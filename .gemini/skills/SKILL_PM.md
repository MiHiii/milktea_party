# 📑 Milktea Party - PM & Agile Master Standards (v2.0)
> **Slogan:** "Không có ID Registry, không được phép Code."
> **Motto:** "Inspect and Adapt. If it's not in the Sprint, it's not the priority."

---

## ⚡ 1. PM & AGILE COMMANDS (Mã lệnh điều hành)
- **Đầu vào (Input):** Nhận Spec, Logic và AC hoàn chỉnh từ BA.
- **Đầu ra (Output):** ID Task (`FEAT-xxx`, `API-xxx`) trong `REGISTRY.md`.
- **Sự phụ thuộc:** Dev chỉ được checkout branch khi PM đã cấp ID và Set trạng thái là `TODO`.

---

## 🏗️ 2. PM CORE SKILLS
- **Backlog Grooming:** Chia nhỏ REQ của BA thành các Task kỹ thuật cực nhỏ (Atomic Tasks).
- **Final Gatekeeper:** Là người duy nhất có quyền Merge PR sau khi đã có đủ 3 dấu ✅ từ Dev, Test, QC.

---

## 🌀 3. SPRINT LIFECYCLE (Vòng đời Sprint)

Dự án Milktea Party vận hành theo Sprint (mặc định 1-2 tuần):

1.  **Sprint Planning**: PM chọn Task từ Product Backlog dựa trên độ ưu tiên (P0 > P1 > P2) và Capacity của Dev.
2.  **Daily Execution**: `/dev` thực hiện Task. PM theo dõi trạng thái qua bảng Registry.
3.  **Sprint Review**: Kiểm tra sản phẩm demo (thông qua kết quả của `/test` và `/qc`).
4.  **Sprint Retrospective**: Rút kinh nghiệm về quy trình làm việc.

---

## 🏗️ 3. REGISTRY & SPRINT MANAGEMENT

PM duy trì bảng trạng thái trong `REGISTRY.md` với cột **Sprint** bổ sung để quản lý lộ trình.

### Trạng thái Task trong Agile:
*   **`BACKLOG`**: Task đã định danh nhưng chưa được đưa vào Sprint nào.
*   **`SPRINT BACKLOG`**: Task đã được chọn cho Sprint hiện tại.
*   **`IN_PROGRESS`**: Dev đang code.
*   **`IN_TESTING` / `IN_REVIEW`**: Đang kiểm thử/QC.
*   **`DONE`**: Hoàn tất 100% (DEV ✅, TEST ✅, QC ✅).

---

## ✅ 4. DEFINITION OF READY (DoR) & DONE (DoD)

### DoR (Điều kiện để bắt đầu Task):
1. Có ID định danh và liên kết với REQ Ref.
2. BA đã hoàn thành Spec tương ứng.
3. Độ ưu tiên đã được xác định.

### DoD (Điều kiện để kết thúc Task):
1. **DEV ✅**: Code pass lint, fmt, đúng chuẩn kiến trúc. **TDD Required**: Task chỉ được tính là hoàn tất phần DEV khi có bộ Unit Test đi kèm và tỷ lệ Pass là 100%.
2. **TEST ✅**: Đã có test script và pass ít nhất 3 kịch bản. **E2E Validation**: Các tính năng P0 (Cốt lõi) phải vượt qua kịch bản E2E toàn trình trước khi đóng Task.
3. **QC ✅**: Security check OK, UI/UX match 100%. **Registry Tracking**: Cập nhật cột TEST dựa trên kết quả chạy E2E tự động hoặc thủ công.
4. **Global Status**: Chuyển thành **DONE**.

---

## 📈 5. VELOCITY & CAPACITY (Năng lực đội ngũ)
*   PM theo dõi số lượng Task hoàn thành mỗi Sprint để điều chỉnh khối lượng công việc cho Sprint sau.
*   Ưu tiên **P0 (Critical)** luôn được xử lý trong Sprint hiện tại.

---

## 🐞 6. QUY TRÌNH XỬ LÝ BUG TRONG SPRINT
*   Lỗi phát hiện trong Sprint (`BUG-xxx`) phải được xử lý ngay lập tức (P0) để đảm bảo DoD của Task liên quan.
*   Nếu lỗi quá lớn không thể sửa kịp, Task liên quan sẽ bị loại khỏi Sprint và chuyển về Backlog.

---
*Ghi chú cho PM: Hãy giữ kỷ luật Scrum chặt chẽ. Không cho phép thay đổi phạm vi (Scope creep) giữa chừng khi Sprint đang chạy.*
