# 🧋 Milktea Party

Ứng dụng đặt trà sữa theo nhóm (Group Ordering) hiện đại, tinh gọn và dễ sử dụng. Giúp việc gom đơn, tính tiền và thanh toán trở nên nhanh chóng, chính xác.

## ✨ Tính năng nổi bật

### 👥 Người tham gia (User)
- **Đặt món nhanh**: Giao diện tối ưu, nhập tên món, giá, số lượng và các tùy chọn (đường, đá, topping).
- **Thanh toán linh hoạt**: Hỗ trợ chia mã QR lẻ cho từng món hoặc gộp chung cả đơn.
- **Theo dõi thời gian thực**: Cập nhật trạng thái đơn hàng và danh sách món của mọi người ngay lập tức qua Supabase Realtime.
- **Mobile Responsive**: Giao diện compact, hoạt động mượt mà trên trình duyệt di động.

### 👑 Chủ phòng (Host)
- **Quản lý đơn hàng**:
  - **Chia đợt đơn**: Gom nhóm các món vào các đợt đặt khác nhau (Đơn 1, Đơn 2...).
  - **Đổi tên đợt đơn**: Chỉnh sửa tên đợt ngay tại giao diện cài đặt.
  - **Chốt đơn/Mở lại**: Khóa không cho thêm món khi đã bắt đầu đặt hàng.
- **Cấu hình thanh toán**:
  - **Mã nhận tiền**: Hỗ trợ quét mã QR ngân hàng để tự động điền thông tin.
  - **Tài khoản chung (Global)**: Lưu thông tin ngân hàng vào thiết bị để tự động sử dụng cho tất cả các buổi đặt sau.
  - **Tính tiền thông minh**: Tự động tính toán Phí ship và Giảm giá theo tỷ lệ giá trị món ăn của từng người.
- **Bảo mật**: Tùy chọn đặt mật khẩu cho phòng để tránh người lạ tham gia.

## 🛠️ Công nghệ sử dụng

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS 4, Lucide React (Icons).
- **Backend/Database**: Supabase (PostgreSQL + Realtime).
- **Forms**: React Hook Form, Zod.
- **Payments**: Tích hợp VietQR (QR Generation & Parsing).

## 🚀 Bắt đầu phát triển

### 1. Yêu cầu hệ thống
- Node.js 18.x trở lên.
- Một project Supabase (miễn phí).

### 2. Cấu hình Supabase
Tạo các bảng trong cơ sở dữ liệu của bạn (xem thư mục `supabase/schema.sql` để biết chi tiết cấu trúc):
- `sessions`: Lưu thông tin buổi đặt trà sữa.
- `participants`: Lưu thông tin người tham gia.
- `order_items`: Lưu danh sách các món đã đặt.

Bật tính năng **Realtime** cho bảng `order_items`, `participants` và `sessions`.

### 3. Cài đặt biến môi trường
Tạo file `.env.local` tại thư mục gốc:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Chạy ứng dụng
```bash
# Cài đặt thư viện
npm install

# Chạy server phát triển
npm run dev
```
Mở `http://localhost:3000` trên trình duyệt để bắt đầu.

## 📱 Giao diện Mobile
Ứng dụng được thiết kế theo phong cách "Mobile-First" với các hàng món ăn tinh gọn, các nút thao tác nhanh (Sửa/Xóa) hiện khi tương tác, và hiệu ứng chuyển cảnh mượt mà.

---
Phát triển bởi [mihi](https://github.com/mihi) AND GEMINI
