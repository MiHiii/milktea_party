# 🧋 Milktea Party — Expert Skill Profile (v3.4)

## 🏗️ Technical Stack Context

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript

### Styling
- Tailwind CSS 4 (latest utilities)

### Icons
- Lucide React

### Backend / Database
- Go (Golang)
- PostgreSQL
- WebSockets / SSE (for Realtime)

### Validation
- Zod + React Hook Form

Rule:
> Always define **Zod Schema first** before building any form.

---

# 🎨 UI / UX Standards (Mandatory)

## 1. Form & Controls (Surgical Refactor v3.1)

### Item Form Layout
- **Hàng 1:** Tên món (Full width).
- **Hàng 2:** Đơn giá (2/3) & Số lượng (1/3).
- **Hàng 3:** Topping / Ghi chú (Compact height, italic text).
- **Hàng 4+:** Segmented Controls (Đường/Đá) & Chia đơn.

### Quantity Stepper
Never use text input. Use: `[-] {count} [+]`
- Style: `bg-black/40 border-white/10 rounded-xl`
- Minimum touch area: **40px**

### Segmented Control (Sugar / Ice)
Capsule style horizontal buttons.
- **Container:** `bg-black/40 p-1 rounded-full border border-white/10`
- **Active state:** `bg-sky-500 text-white shadow-lg rounded-full`
- **Inactive state:** `text-white/30 hover:text-white/50`
- **Labels:** Viết hoa "ĐƯỜNG", "ĐÁ".

### Action Icons & Symbols
- **LOẠI BỎ:** Ký tự "đ" và "x" trong các ô input (Giá, Số lượng). 
- Chỉ dùng placeholder hoặc label bên ngoài.

### Footer Buttons
- "Lưu thay đổi" (Primary - Blue) & "Huỷ" (Ghost/Outline) nằm trên cùng 1 hàng.
- Nút Huỷ: `variant="ghost"` hoặc `text-white/40`.

---

## 2. CHIA ĐƠN (Order Batching)
- **Style:** Viền xanh lá nhạt, nền `emerald-500/5`.
- **Icon:** Phải có icon `Users` (Lucide) ở đầu input.
- **Label:** "CHIA ĐƠN" viết hoa, màu `emerald-500/60`, font-black.

---

## 3. Room Access & Sharing
- **Multi-Join Input:** Chấp nhận UUID, Short ID (6 chars), hoặc Full URL.
- **Compact Order List:** Chỉ hiện **3 món mới nhất**, nút "Xem thêm (+X)" để mở rộng.
- **QR Card:** Max size 140px, bố cục side-by-side với Bill Summary.

---

# 🗄️ Backend & API Architecture (Production-Grade v3.4)

## 1. Reliability & Data Integrity (The "Last Boss" Defense)
Đảm bảo hệ thống không bao giờ xảy ra sai lệch dữ liệu dù mạng lag hay user "spam" click.
- **Idempotency Key (Safety Net):** Mọi request thay đổi dữ liệu (Add/Update/Delete) phải gửi kèm `Idempotency-Key` (UUID) trong Header.
  - *Flow:* Check key trong DB/Redis → Nếu có thì trả về response cũ → Nếu chưa thì thực thi + Lưu result kèm key.
- **Safe Cache Invalidation:** Tuyệt đối không xóa cache trước hoặc trong Transaction.
  - *Rule:* Chỉ gọi `cache.Delete(sessionID)` ngay sau khi `tx.Commit()` thành công. Sử dụng `defer` kết hợp kiểm tra lỗi để đảm bảo an toàn.
- **Pessimistic Locking:** Sử dụng `SELECT ... FOR UPDATE` trong Transaction để lock trạng thái Session, chặn đứng mọi hành vi chỉnh sửa khi đơn đã vào luồng Chốt (Finalize).

## 2. WebSocket Robustness (Backpressure Control)
Chống tình trạng "một người mạng yếu làm nghẽn cả phòng".
- **Buffered Channels:** Mỗi kết nối Client được cấp một chan `[]byte` có buffer (ví dụ: size 256).
- **Non-blocking Send:** Sử dụng `select` block với `default` case khi gửi tin nhắn qua WebSocket.
  - *Logic:* Nếu channel của client bị đầy (do mạng chậm), hệ thống sẽ chủ động drop tin nhắn hoặc ngắt kết nối client đó thay vì làm treo toàn bộ Broadcast Hub.
- **Reconnect & Version Sync:** Khi Client kết nối lại, gửi `last_version`. Nếu gap > 1, ép Client tải lại toàn bộ Snapshot qua HTTP để đảm bảo đồng bộ.

## 3. Production Hardening & Resilience
Xây dựng "giáp" cho Server trước các lỗi runtime và quá trình deploy.
- **Graceful Shutdown:** Bắt các tín hiệu `SIGINT`, `SIGTERM` để đóng mọi kết nối WebSocket, giải phóng Pool Database và hoàn thành các Transaction đang dang dở trước khi tắt Server.
- **Panic Recovery Middleware:** Luôn có lớp bọc (wrapper) để bắt panic. Tránh việc một lỗi logic nhỏ làm sập toàn bộ tiến trình (process) Backend.
- **Structured Logging:** Sử dụng `slog` (Go 1.21+) hoặc `zap` để ghi log dạng JSON. Mỗi log phải kèm theo `session_id`, `user_id` và `request_id` để dễ dàng truy vết (tracing).
- **Rate Limiting:** Giới hạn cứng 10 req / 5s / user ngay tại lớp Middleware đầu tiên.

---

# 💾 Database & Business Logic

## 1. Financial & Business Logic Rules (Strict)

| Tính năng | Đặc tả kỹ thuật |
| :--- | :--- |
| **ID Generation** | Sử dụng **UUID v7** (Time-ordered) để tối ưu hóa việc sắp xếp và indexing trong PostgreSQL. |
| **Calculation** | **Recalculate on Demand**. Không tin vào dữ liệu cũ, luôn tính tổng từ danh sách món thực tế trong DB. |
| **Rounding** | Làm tròn đến **1000 VNĐ** gần nhất tại lớp Delivery (trước khi gửi response cho người dùng). |
| **Context** | Áp dụng **context.WithTimeout (3-5s)** cho mọi thao tác I/O để chống treo tài nguyên. |
| **Shipping Split** | Phân bổ phí ship theo tỷ lệ giá trị món ăn. |
| **Pay Separate** | `pay_separate = true` sẽ tách riêng mã QR và không gộp vào bill batch. |

## 2. Permissions
- **Ownership:** Participant chỉ CRUD món của mình.
- **Host Power:** Lock session, ghi đè phí ship/giảm giá, quản lý toàn bộ đợt đơn.
- **Locked State:** Khi `status = 'locked'`, cấm mọi hành vi Add/Edit/Delete.

## 3. Operations logic
- **Batching Strategy:**
  - Khi `is_split_batch` chuyển ON: Tự động Upsert Batch mặc định (`is_default=true`, `name="Đơn 1"`) và migrate toàn bộ item lẻ vào đây.
  - Khi `is_split_batch` chuyển OFF: Gộp toàn bộ items về Batch mặc định, xóa các Batch phụ không có món.
- **QR Priority Resolution:**
  - Nếu `sessions.use_default_qr_for_all = true` -> Dùng `sessions.host_default_qr_payload`.
  - Nếu `false`: Ưu tiên `order_batches.qr_payload`, nếu NULL mới fallback về `sessions.host_default_qr_payload`.
- **Locking Flow:** Chặn nút "Chốt đơn" nếu `host_default_bank_account` trống. Yêu cầu hiển thị Modal Setup trước.

---

# ⚠️ Coding Guardrails (Zero-Error Mindset)

- **Input is Poison:** Mọi dữ liệu từ Client phải đi qua Zod (Frontend) và Validator (Backend) trước khi chạm vào Service layer.
- **Transaction-First:** Mọi thay đổi liên quan đến tiền bạc/trạng thái đơn hàng bắt buộc phải nằm trong Transaction.
- **Observability:** Nếu một hành động thất bại, log phải ghi rõ: Tại sao? Ở đâu? Do ai? (Metadata JSON).
- **Define First:** Luôn định nghĩa logic biến trước khi dùng trong JSX.
- **Import Check:** Kiểm tra Lucide icons và UI components trước khi dùng.
- **Realtime / WebSockets Cleanup:** Luôn đóng kết nối WebSocket hoặc SSE trong `useEffect` cleanup.

---

# 📝 Formatting
- **Currency:** `50.000đ` (Sử dụng `Intl.NumberFormat('vi-VN')`).
- **Status Colors:**
  - Online: Green
  - Away (>5m): Yellow
  - Offline (>15m): Gray
- **Branding:**
  - Blue (Sky-500): Payment, Submit, Primary Actions.
  - Green (Emerald-500): Sharing, Join, Batching (CHIA ĐƠN).
  - Rose (Rose-500): Destructive actions.
