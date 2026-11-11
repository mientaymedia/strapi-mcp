# Phụ lục

## Xác thực domain / URL cho App

Cần xác thực domain/URL sở hữu bởi doanh nghiệp trước khi dùng cho dịch vụ Zalo Platform (đảm bảo không ai khác dùng trái phép domain của bạn). Vào **Quản lý ứng dụng → Xác thực domain**, nhập domain/URL cần xác thực. Nên đăng ký **nhiều phương thức** đề phòng 1 phương thức lỗi. 1 domain xác thực được cho nhiều App, và ngược lại.

### 1. Xác thực với domain (3 cách)

- **Thêm DNS TXT record**: thêm bản ghi TXT vào DNS. Kiểm tra cả domain và subdomain `zalo_verifier` của second-level domain (vd nhập `example.com` → check TXT trên `example.com` và `zalo_verifier.example.com`; nhập `my-subdomain.example.com` → check trên chính nó và `zalo_verifier.example.com`).
- **Tải tệp HTML lên website**: download file từ Zalo Platform, upload lên web — **không xóa** kể cả sau khi xác thực thành công (cần để duy trì trạng thái).
- **Thêm thẻ meta vào trang chủ**: chèn thẻ meta vào mã nguồn `https://<domain>` — không xóa sau khi xác thực.

### 2. Xác thực với tiền tố URL (2 cách)

Xác thực 1 URL (vd `https://example.com/party/`) → mọi URL có path con tự động được coi là đã xác thực. URL có query string → bỏ qua phần query. URL có extension file → bỏ qua phần path chứa extension.

- **Tải tệp HTML lên website** (giống trên, áp dụng cho path cụ thể).
- **Thêm thẻ meta**: Zalo coi URL đã nhập là trang chủ của website đó.

### 3. Hủy xác thực

Xóa DNS TXT record/file HTML/thẻ meta tương ứng trên website **trước**, rồi bấm nút "X" cạnh domain/URL trong danh sách → xác nhận.

### Giới hạn

- Tối đa **20 domain** và **20 URL** xác thực / App.
- Tối đa **75 ký tự** / domain hoặc URL.
- **Không kiểm tra** xác thực domain với `localtunnel.me`, `ngrok.io`, `localhost.run`, `serveo.net` (tiện cho dev).

## Mã trạng thái Video (dùng chung Article API & upload video)

| Mã | Mô tả |
|---|---|
| 0 | Trạng thái không xác định |
| 1 | Video đã xử lý thành công, có thể sử dụng |
| 2 | Video đã bị khóa |
| 3 | Video đang được xử lý |
| 4 | Video xử lý thất bại |
| 5 | Video đã bị xóa |

## Nguồn tài liệu gốc

Toàn bộ nội dung trong `apizalo/` được tổng hợp thủ công từ `docs.zaloplatforms.com` (mục OA, ZOA Extension) do người dùng dán trực tiếp vào phiên làm việc — `docs.zaloplatforms.com` và `mini.zalo.me` bị chặn egress trong môi trường agent nên không tự fetch được. Khi cần xác minh chi tiết không có trong skill này (hình ảnh minh họa, các trang chưa được dán), tra cứu trực tiếp trên `docs.zaloplatforms.com` hoặc hỏi người dùng dán thêm nội dung.
