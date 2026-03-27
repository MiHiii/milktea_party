# 🧋 Tài liệu Đặc tả API & Chức năng - Milktea Party (v1.0)

Tài liệu này mô tả chi tiết các chức năng và các điểm cuối API (API Endpoints) của hệ thống đặt trà sữa chung, dựa trên phân tích mã nguồn Go (Backend) và Next.js (Frontend).

---

## 🏗️ 1. Tổng quan Hệ thống (System Overview)

Hệ thống cho phép người dùng (Host) tạo một phiên đặt trà sữa (Session), chia sẻ link cho bạn bè (Participants) cùng vào đặt món (OrderItems). Hệ thống hỗ trợ chia đơn hàng thành nhiều đợt (OrderBatches) và tự động tính toán chi phí, phí ship, giảm giá cũng như tạo mã QR thanh toán.

### Thực thể chính (Core Entities)
- **Session**: Phòng đặt trà sữa, chứa thông tin cấu hình (phí ship, giảm giá, mật khẩu, link quán).
- **Participant**: Người tham gia trong session. Có thể là Host hoặc Guest. Định danh qua `DeviceID`.
- **OrderItem**: Món ăn/đồ uống do người tham gia đặt. Gắn với một Session và một Participant.
- **OrderBatch**: Nhóm các món ăn lại với nhau (ví dụ: Đơn văn phòng A, Đơn văn phòng B) để dễ quản lý và thanh toán.

---

## 🎨 2. Chức năng chính & Case sử dụng (Core Functionalities & Use Cases)

### A. Các kịch bản sử dụng (Typical Scenarios)
1.  **🧋 Đặt trà sữa/cà phê chiều**: Host gom đơn để áp mã Freeship/Giảm giá của App (Grab, ShopeeFood).
2.  **🍱 Cơm trưa văn phòng**: Đặt chung món để tiết kiệm phí ship, hỗ trợ ghi chú chi tiết (ví dụ: không hành, nhiều cơm).
3.  **🍺 Chia tiền nhậu (After-party)**: Nhập tổng bill sau khi ăn xong để chia đều cho mọi người nhanh chóng qua mã QR.
4.  **🛒 Mua sắm chung**: Chia tiền mua quà sinh nhật, đồ đi picnic hoặc tiền điện nước trong phòng.

### B. Quản lý Session & Trạng thái (State Machine)
Hệ thống vận hành theo các trạng thái nghiêm ngặt để đảm bảo tính sòng phẳng:
- **OPEN (Đang nhận món)**: Mọi người có thể vào phòng, thêm/sửa/xóa món của mình.
- **LOCKED (Chốt đơn)**: Host khóa phòng để tiến hành đặt đồ. Guest không thể chỉnh sửa dữ liệu.
- **ORDERED (Đã đặt hàng)**: Host xác nhận đã thanh toán cho quán. Ở bước này, Host cập nhật **Giá thực tế** (nếu quán đổi giá) và phí ship cuối cùng.
- **SETTLING (Thanh toán)**: Hệ thống tính toán bill cuối cùng và hiển thị mã QR kèm số tiền đã làm tròn cho từng người.
- **COMPLETED (Hoàn tất)**: Tất cả thành viên đã trả tiền. Session đóng lại và lưu vào lịch sử.
- **CANCELLED (Đã hủy)**: Đơn hàng bị hủy.

### C. Định danh Người tham gia (Participant Logic)
- **Định danh**: Sử dụng `DeviceID` lưu tại LocalStorage để nhận diện thiết bị.
- **Nickname**: Người dùng nhập tên khi tham gia lần đầu. Hệ thống map `(SessionID, DeviceID) -> Nickname`.
- **Trạng thái**: Tự động theo dõi Online/Offline của khách qua Heartbeat để Host biết ai đang sẵn sàng.

---

## ⚙️ 5. Quy tắc Nghiệp vụ Đặc thù (Business Logic)

1. **Tính toán & Làm tròn (Rounding)**:
   - `FinalPrice = (Giá_món * Số_lượng) - Giảm_giá_phân_bổ + Ship_phân_bổ`.
   - Tiền thanh toán luôn được **làm tròn đến 1.000 VNĐ** gần nhất (ví dụ: 32.400 -> 32.000, 32.600 -> 33.000).
   - Phần chênh lệch do làm tròn (Residual) được cộng/trừ vào bill của Host để tổng tiền thu về khớp 100% với hóa đơn.

2. **Quản lý Edge Cases**:
   - **Host xóa phòng**: Thông báo tức thì qua WebSocket để Guest ngừng đặt.
   - **Quán hết món**: Host có quyền xóa món của Guest hoặc chỉnh sửa giá ngay cả khi đã LOCK đơn.
   - **Thanh toán riêng (Pay Separate)**: Món được đánh dấu này sẽ không tham gia vào việc phân bổ phí ship/giảm giá chung của nhóm.
   - **Bảo mật**: Sử dụng `Idempotency-Key` để tránh việc bấm nút "Thêm món" liên tục dẫn đến đặt trùng.

---
*Tài liệu này được trích xuất tự động từ mã nguồn dự án Milktea Party.*
