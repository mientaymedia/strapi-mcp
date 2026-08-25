---
name: api-zalo
description: Tài liệu tham chiếu để tích hợp/lập trình với nền tảng Zalo — Zalo OA OpenAPI (Official Account: gửi tin, webhook, quản lý người dùng/nhãn, nhóm chat GMF, gọi thoại ZCC), Zalo OA Extension (ZOA — zoa-cli, zone, zoaSdk), Widget cấp tương tác trên website, và ZBS Template Message (tin Giao dịch/Truyền thông theo mẫu). Dùng skill này bất cứ khi nào người dùng hỏi về Zalo OA, Zalo API, Official Account, ZNS, gửi tin Zalo, webhook Zalo, OAuth Zalo, access_token OA, Zalo Mini App gửi thông báo qua OA, ZOA Extension, zoa-cli, developers.zalo.me, openapi.zalo.me, hoặc muốn viết code gọi API Zalo/xử lý webhook Zalo — kể cả khi họ không gọi thẳng tên "Zalo API". LUÔN đọc file reference tương ứng trước khi viết code hoặc trả lời chi tiết về endpoint/tham số — đừng đoán cấu trúc request/response, vì Zalo có nhiều phiên bản API (v2/v3/v4) dễ nhầm.
---

# API Zalo — tài liệu tham chiếu

Bộ tài liệu nội bộ tổng hợp từ `docs.zaloplatforms.com`, dùng khi code tích hợp với nền tảng Zalo cho các dự án của MienTay Media (Zalo OA, Mini App, ZOA Extension). Tài liệu gốc bằng tiếng Việt — giữ nguyên ngôn ngữ khi trích dẫn.

## Cách dùng skill này

1. Xác định người dùng đang cần sản phẩm/luồng nào của Zalo (bảng bên dưới).
2. Đọc đúng file `references/*.md` liên quan trước khi trả lời hoặc viết code — các file này chứa endpoint, tham số, ví dụ request/response thật.
3. Nếu câu hỏi liên quan xác thực (OAuth, access token, App Secret Key) → luôn đọc `references/01-auth.md` trước, vì gần như mọi API khác đều cần `access_token` lấy từ đó.
4. Nếu liên quan webhook (nhận sự kiện từ Zalo) → đọc `references/07-webhooks.md`, đặc biệt chú ý phần "Xác thực chữ ký" — **có 2 công thức HMAC khác nhau cho 2 sản phẩm khác nhau**, xem mục Gotcha bên dưới.

## Chỉ mục theo chủ đề

| Chủ đề | File | Khi nào đọc |
|---|---|---|
| Xác thực OAuth 2.0 (PKCE), access/refresh token, App Secret Key, thuật ngữ chung, rate limit | `references/01-auth.md` | Bất kỳ tích hợp OA OpenAPI nào — luôn cần trước |
| Gửi tin nhắn OA: Tư vấn (CS), Giao dịch (Transaction/ZBS), Truyền thông (Promotion/Broadcast), tin ẩn danh, react, quote, upload media, cấu trúc `buttons`/`elements` | `references/02-messaging.md` | Gửi tin nhắn, thông báo đơn hàng, marketing qua OA |
| Nhóm chat GMF (Group Management Function): tạo/quản lý nhóm, gửi tin nhóm, thành viên, hạn mức | `references/03-groups-gmf.md` | Tính năng nhóm tư vấn khách hàng qua OA |
| Gọi thoại ZCC (Zalo Cloud Connect): kết nối SIP trunk, xin quyền gọi, tạo link gọi | `references/04-calling-zcc.md` | Tích hợp Call Center/tổng đài với OA |
| Article API: tạo/quản lý bài viết, video cho OA | `references/05-articles.md` | Đăng nội dung lên OA |
| Quản lý người dùng & OA: nhãn (tag), trường thông tin tùy biến, danh sách/chi tiết người dùng, quota, thông tin OA, mua gói dịch vụ | `references/06-user-management.md` | CRM/CDP đồng bộ dữ liệu khách hàng, quản lý gói OA |
| Webhook: toàn bộ event catalog, cấu hình, retry, chữ ký xác thực | `references/07-webhooks.md` | Nhận sự kiện real-time từ Zalo |
| Zalo OA Extension (ZOA): zone, zoaSdk, zoa-cli, app-config.json | `references/08-extension-zoa.md` | Xây tiện ích chạy trong OA Manager (khác Mini App) |
| Widget cấp tương tác (website) | `references/09-widget-interaction.md` | Xin quyền gửi Zalo notification từ website |
| Bảng mã lỗi OA API | `references/10-error-codes.md` | Xử lý lỗi khi gọi API |
| Phụ lục: trạng thái video, xác thực domain/URL cho App | `references/11-appendix.md` | Setup App, upload video |

## Gotcha quan trọng (đọc trước khi code)

- **Có 3 hệ endpoint dễ nhầm cho tin nhắn**: `v2.0/oa/message` (cũ, tin văn bản/ảnh/file/sticker cơ bản — vẫn dùng cho tin ẩn danh và react), `v3.0/oa/message/cs` (tin Tư vấn, thay thế phần lớn v2), `v3.0/oa/message/transaction` và `v3.0/oa/message/promotion` (ZBS Template Message). Đừng trộn endpoint cũ/mới trong cùng luồng — xem `02-messaging.md`.
- **Hai công thức HMAC khác nhau, đừng lẫn:**
  - Webhook OA (`X-ZEvent-Signature`): `sha256(appId + data + timeStamp + OAsecretKey)` — **có** `timeStamp`.
  - `zoaSdk.getSessionInfo()` trong ZOA Extension: `sha256(extensionId + sortedJsonData + secretKey)` — **không có** timestamp, và `data` phải sort field theo tên tăng dần trước khi hash.
- **API cũ dừng hỗ trợ OA Doanh nghiệp từ 01/06/2024**: `getfollowers`, `getprofile`, `updatefollowerinfo` (v2.0) → thay bằng `v3.0/oa/user/getlist|detail|update`.
- **Từ 01/01/2026 → 01/03/2026**: Tin UID Giao dịch/Truyền thông cá nhân kiểu cũ ngừng cấp, chuyển hẳn sang ZBS Template Message (`v3.0/oa/message/transaction`, `v3.0/oa/message/promotion`).
- **App Secret Key** (lấy tại trang Quản lý ứng dụng → Cài đặt) chỉ dùng ở **backend**, không bao giờ đưa vào code frontend/Mini App/Extension — xem `01-auth.md`.
- **Zone của ZOA Extension** không phải tất cả đều `enable` mặc định — phải khai báo trong `app-config.json`; `roles` chỉ áp dụng cho zone bắt đầu bằng `admin-*`, để trống = hiển thị mọi role admin. Roles hợp lệ: `MANAGER`, `MODERATOR`, `CUSTOMER_SERVICE`, `ADVERTISER`, `INSIGHT_ANALYST`, `AGENCY` (không phải `"admin"`/`"agent"` như một số ví dụ mẫu cũ).
