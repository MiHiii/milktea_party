# 🧋 Milktea Party — Expert Skill Profile (v3.1)

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
- Supabase (PostgreSQL + Realtime)

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

# 💾 Database & Business Logic

## 1. Financial Logic (Strict Rules)
- **Shipping Split:** Phân bổ phí ship theo tỷ lệ giá trị món ăn.
- **Rounding Rule:** Làm tròn đến **1000 VNĐ** gần nhất (ví dụ: 49,200 → 49,000; 49,600 → 50,000).
- **Pay Separate:** `pay_separate = true` sẽ tách riêng mã QR và không gộp vào bill batch.

## 2. Permissions
- **Ownership:** Participant chỉ CRUD món của mình.
- **Host Power:** Lock session, ghi đè phí ship/giảm giá, quản lý toàn bộ đợt đơn.
- **Locked State:** Khi `status = 'locked'`, cấm mọi hành vi Add/Edit/Delete.

- **Batching Strategy:** - Khi `is_split_batch` chuyển ON: Tự động Upsert Batch mặc định (`is_default=true`, `name="Đơn 1"`) và migrate toàn bộ item lẻ vào đây.
  - Khi `is_split_batch` chuyển OFF: Gộp toàn bộ items về Batch mặc định, xóa các Batch phụ không có món.
- **QR Priority Resolution:** - Nếu `sessions.use_default_qr_for_all = true` -> Dùng `sessions.host_default_qr_payload`.
  - Nếu `false`: Ưu tiên `order_batches.qr_payload`, nếu NULL mới fallback về `sessions.host_default_qr_payload`.
- **Locking Flow:** - Chặn nút "Chốt đơn" nếu `host_default_bank_account` trống. Yêu cầu hiển thị Modal Setup trước.

# ⚠️ Coding Guardrails (Anti-Error)

## Variables & Imports
- **Define First:** Luôn định nghĩa logic biến trước khi dùng trong JSX.
- **Import Check:** Kiểm tra Lucide icons và UI components trước khi dùng.

## Cleanup
- **Realtime:** Luôn remove channel trong `useEffect` cleanup.
  ```ts
  useEffect(() => {
    const channel = supabase.channel("room")
    return () => { supabase.removeChannel(channel) }
  }, [])
  ```

---

# 📝 Formatting
- **Currency:** `50.000đ` (Sử dụng `Intl.NumberFormat('vi-VN')`).
- **Status Colors:**
  - Online: Green
  - Away (>5m): Yellow
  - Offline (>15m): Gray
- **Branding:**
  - **Blue (Sky-500):** Payment, Submit, Primary Actions.
  - **Green (Emerald-500):** Sharing, Join, Batching (CHIA ĐƠN).
  - **Rose (Rose-500):** Destructive actions.
