# 🎨 Milktea Party — UI / UX & Styling Standards (v1.0)

Tài liệu này quy định các chuẩn mực về giao diện, thành phần (Components) và trải nghiệm người dùng để đảm bảo tính nhất quán trên toàn bộ ứng dụng.

---

## 🏗️ 1. TECHNICAL STACK (Frontend)
- **Framework:** Next.js 16 (App Router), React 19.
- **Styling:** Tailwind CSS 4 (CSS Variables Engine).
- **Icons:** Lucide React.
- **Validation:** Zod + React Hook Form.

---

## 📐 2. LAYOUT & COMPONENTS STANDARDS

### A. Item Form Layout (Surgical Refactor)
Mọi form nhập món ăn phải tuân thủ lưới sau:
- **Hàng 1:** Tên món (`Full width`, font-bold).
- **Hàng 2:** Đơn giá (`col-span-8`) & Số lượng (`col-span-4`).
- **Hàng 3:** Topping / Ghi chú (`Compact height`, `italic`, `text-sm`).
- **Hàng 4+:** Segmented Controls (Đường/Đá) & Nút Chia đơn.

### B. Quantity Stepper
Tuyệt đối không dùng `input type="text"`. Sử dụng cụm điều khiển: `[-] {count} [+]`
- **Style:** `bg-black/40 border-white/10 rounded-xl`.
- **Touch Area:** Tối thiểu **40px** để dễ bấm trên điện thoại.

### C. Segmented Control (Sugar / Ice)
Sử dụng kiểu Capsule (Viên thuốc) nằm ngang.
- **Container:** `bg-black/40 p-1 rounded-full border border-white/10`.
- **Active state:** `bg-sky-500 text-white shadow-lg rounded-full transition-all`.
- **Labels:** Viết hoa "ĐƯỜNG", "ĐÁ".

### D. Action Buttons (Footer)
- "Lưu thay đổi" (Primary - Blue) & "Huỷ" (Ghost/Outline) nằm trên cùng 1 hàng.
- Nút Huỷ: Luôn sử dụng `variant="ghost"` hoặc `text-white/40` để giảm sự chú ý.

---

## 🧼 3. BRANDING & VISUAL SYSTEM

### A. Status Colors
- **Online:** `text-emerald-500` (Xanh lá).
- **Away (>5m):** `text-amber-500` (Vàng).
- **Offline (>15m):** `text-slate-500` (Xám).
- **Locked State:** Overlay mờ `backdrop-blur-sm` trên toàn bộ danh sách món.

### B. Theme Colors (Tailwind 4)
- **Primary (Payment/Action):** `sky-500`.
- **Batching (Chia đơn):** `emerald-500`.
- **Destructive (Delete/Cancel):** `rose-500`.

### C. QR Payment Card
- **Kích thước:** Max-width `140px`.
- **Bố cục:** Side-by-side với bảng tóm tắt Bill (Bill Summary).

---

## 📝 4. FORMATTING RULES
- **Tiền tệ:** Luôn dùng `50.000đ` (Định dạng qua `Intl.NumberFormat('vi-VN')`).
- **Symbols:** Không đặt ký tự "đ" hoặc "x" bên trong ô Input. Chỉ dùng Label hoặc Placeholder bên ngoài.

---
> **Lưu ý cho /dev:** Mọi Component mới phải được đối soát với file này trước khi bàn giao cho QC.
