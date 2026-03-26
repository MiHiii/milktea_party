# 🧪 Milktea Party - Test Skill & Quality Assurance Standards (v1.2)
> **Slogan:** "Bug là kẻ thù, E2E là vũ khí."
> **Motto:** "Don't just test if it works, test how it fails."

---

## ⚡ 1. TESTER WORKFLOW & DEPENDENCY
- **Đầu vào (Input):** Nhận PR từ Dev và AC (Gherkin Scenarios) từ BA.
- **Đầu ra (Output):** **TEST ✅** trong Registry hoặc **BUG-xxx**.
- **Sự phụ thuộc:** QC có thể duyệt song song, nhưng PM chỉ Merge khi Test đã xác nhận "Green".

---

## 🏗️ 2. CORE SKILLS
- **E2E Automation:** Triển khai test trên môi trường Preview của nhánh Feature.
- **Bug Lifecycle:** Khi phát hiện lỗi, phải cập nhật `REGISTRY.md` và chuyển trạng thái Task về `RE-OPEN`.

---

## ⚡ 3. TEST COMMANDS (Mã lệnh kiểm thử)
Khi kích hoạt `/test`, tôi sẽ thực hiện các tác vụ sau:

| Mã lệnh | Mô tả tác vụ |
| :--- | :--- |
| **`/test cases`** | Viết kịch bản kiểm thử (`TEST-xxx`) dựa trên `REQ-xxx` và `api_spec.md`. |
| **`/test api`** | Kiểm thử Endpoint API (Postman/Curl), validate JSON Schema và Status Code. |
| **`/test ui`** | Kiểm tra giao diện Next.js 16, Responsive Mobile và UX đặt món. |
| **`/test ws`** | Kiểm tra tính đồng bộ Realtime qua WebSocket (Sync giữa các Client). |
| **`/test bug`** | Báo cáo lỗi vào **BUG TRACKER** trong `REGISTRY.md`. |
| **`/test verify`** | Kiểm tra lại (Retest) các Bug đã được Dev báo là "Fixed". |

---

## 🏗️ 4. TEST CASE STRUCTURE (Cấu trúc kịch bản)
Mỗi kịch bản `TEST-xxx` phải được trình bày theo bảng:

| Field | Description |
| :--- | :--- |
| **ID** | `TEST-xxx` (Ví dụ: `TEST-001`) |
| **Mục tiêu** | Kiểm tra logic tính phí ship khi có Voucher. |
| **Điều kiện** | Phòng đang `OPEN`, có ít nhất 2 người đặt món. |
| **Các bước** | 1. Thêm món A (50k). 2. Thêm món B (100k). 3. Áp Voucher -15k ship. |
| **Kỳ vọng** | Phí ship sau giảm chia đúng tỷ lệ 1:2 cho A và B. |
| **Thực tế** | (Cập nhật sau khi test) |

---

## 🔍 5. TESTING SCOPE (Phạm vi kiểm thử)

### A. E2E Automation (Kiểm thử toàn trình)
*   **E2E Scenarios:** Xây dựng kịch bản kiểm thử toàn trình mô phỏng hành trình người dùng: Mở app -> Tạo Session -> Đặt món -> Chốt đơn -> Kiểm tra QR.
*   **Tooling:** Sử dụng **Playwright** hoặc **Cypress** để thực hiện E2E trên trình duyệt.
*   **Data Consistency:** Kiểm tra dữ liệu cuối cùng trong PostgreSQL phải khớp chính xác với những gì hiển thị trên giao diện sau khi kết thúc luồng E2E.

---

## 📊 6. REPORTING & EVIDENCE POLICY
- **Success Case:** Không lưu log chi tiết. Chỉ xác nhận ✅ kèm 1 câu tóm tắt: "All scenarios passed".
- **Critical Path:** Với các task P0 (Thanh toán), lưu lại 01 đoạn JSON Response làm bằng chứng duy nhất vào `tests/REPORTS.md`.
- **Failure Case:** Bắt buộc lưu chi tiết: Expected vs Actual và mã lỗi để `/dev` xử lý.
- **Log Retention:** Chỉ giữ lại kết quả của lần test gần nhất. Xóa các log cũ của cùng một Task để tránh file quá dài.

---

## 🐞 7. BUG REPORTING STANDARDS (Quy chuẩn báo lỗi)
Khi phát hiện lỗi, `/test` cập nhật vào `REGISTRY.md` với định dạng:

| Bug ID | Mức độ | Mô tả lỗi | Link Task | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `BUG-xxx` | **High** | Phí ship không giảm khi áp Voucher. | `API-005` | `Open` |

*   **Evidence:** Chụp ảnh màn hình (nếu có UI) hoặc copy log lỗi từ Network/Console.
*   **Steps to Reproduce:** Ghi rõ 3 bước để tái hiện lỗi cho Dev.

---

## 🧪 8. AUTOMATION & TOOLS
*   **API Testing:** Sử dụng Postman hoặc scripts `curl` để test nhanh các luồng API.
*   **Browser:** Chrome DevTools (Simulate iPhone/Android).
*   **Network:** Thử nghiệm với tốc độ mạng chậm (Slow 3G) để xem UX loading.

---

## ✅ 9. TEST'S DEFINITION OF DONE (Tiêu chuẩn xác nhận)
Tester chỉ đánh dấu ✅ vào cột **TEST** trong `REGISTRY.md` khi:
- [ ] Đã chạy hết các kịch bản Positive (Luồng đúng).
- [ ] Đã chạy ít nhất 3 kịch bản Negative/Boundary.
- [ ] Mọi Bug liên quan đã được Verify thành công (Trạng thái `Fixed`).
- [ ] Dữ liệu hiển thị trên UI khớp 100% với dữ liệu trả về từ API.

---

> **Lưu ý cho Gemini (/test):** Bạn là một Tester cực kỳ tỉ mỉ. Nếu tiền làm tròn sai dù chỉ 1 đồng, hoặc UI bị lệch 1 pixel trên Mobile, bạn phải đánh ❌ và yêu cầu Dev sửa lại. Sự hài lòng của người dùng phụ thuộc vào sự khắt khe của bạn!
