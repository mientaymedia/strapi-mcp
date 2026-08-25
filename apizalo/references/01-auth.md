# Xác thực & Ủy quyền (OAuth 2.0) — Zalo OA OpenAPI

## Thuật ngữ chung

| Thuật ngữ | Mô tả |
|---|---|
| Zalo Official Account (OA) | Tài khoản chính thức của Doanh nghiệp trên Zalo, tương tác với người dùng Zalo cá nhân |
| Zalo App (App) | Ứng dụng của doanh nghiệp khởi tạo trên nền tảng Zalo, dùng để quản lý OA hoặc các dịch vụ khác (ZCA, Mini App…) |
| Zalo Cloud Account (ZCA) | Công cụ quản lý chi tiêu cho dịch vụ OA và ZNS. 1 ZCA có thể link nhiều OA và nhiều App |
| OA ID / App ID | ID định danh OA / App |
| Authorization code | Mã ủy quyền cho phép ứng dụng gọi API lấy access token + refresh token |
| Access token | Token cho phép ứng dụng đại diện OA gọi API |
| Refresh token | Dùng để tạo lại access token khi hết hạn |
| UID / UID by App | ID người dùng gắn với OA / gắn với App |
| Admin ID | ID quản trị viên OA |
| Sender ID / From_ID, Recipient ID / To_ID | ID đối tượng gửi/nhận (tùy API là UID hoặc OA ID) |
| Message ID / Msg ID | ID tin nhắn |

Admin của OA, App, ZCA là người dùng Zalo cá nhân — **không nhất thiết phải cùng một người**.

## Mô hình 3 tài khoản cần có

1. **Zalo OA** — tạo tại trang OA Manager nếu chưa có.
2. **Zalo App** — tạo trên `developers.zalo.me`, liên kết với OA để gọi API/Webhook.
3. **ZCA** — quản lý chi tiêu cho các dịch vụ trả phí (OA package, ZNS…), liên kết cả với OA lẫn App.

Doanh nghiệp có thể dùng đồng thời OA OpenAPI (tự động hóa) và OA Manager (giao diện người dùng) — ví dụ CSKH thao tác tay trên OA Manager trong khi CRM đồng bộ dữ liệu qua OpenAPI.

## Mã tài sản (asset_id)

`asset_id` là mã định danh **1 quota** mà một thực thể sở hữu, đi kèm 3 chiều thông tin:

- `quota_owner`: **App** hoặc **OA** — ai sở hữu quota này.
- `product_type`: quota dùng cho tính năng nào (tin nhắn, tạo GMF, …).
- `quota_type`: nguồn gốc quota —
  - `sub_quota`: có được khi mua gói dịch vụ OA
  - `purchase_quota`: có được khi mua lẻ hạn mức
  - `reward_quota`: có được qua chương trình/khuyến mãi/tặng thưởng

`asset_id` dùng trong: gửi tin nhắn (trả về trong response), tạo nhóm GMF (`v3.0/oa/group/creategroupwithoa`), kiểm tra hạn mức (`v3.0/oa/quota/message`, `v3.0/oa/quota/group`).

## Lấy App Secret Key

1. Vào trang quản lý ứng dụng trên `developers.zalo.me` (chọn tại giao diện thu gọn hoặc **Xem tất cả → Ứng dụng**).
2. Vào mục **Cài đặt** → click **copy secret key**.

**Secret Key chỉ dùng ở backend** — không đưa vào mã nguồn frontend (Mini App, ZOA Extension, web client) dưới bất kỳ hình thức nào.

## Cách 1 — OAuth v4 với PKCE (khuyến nghị khi có backend / ứng dụng bên thứ 3)

### Bước 1: Tạo `code_verifier` + `code_challenge`

Zalo dùng PKCE để tăng bảo mật.

```
code_challenge = Base64URL(SHA-256(code_verifier))
```

- `code_verifier`: chuỗi ngẫu nhiên, đủ chữ hoa/thường/số, dài 43 ký tự — **khác nhau cho mỗi request**, không chia sẻ cho bên thứ ba.
- Dùng `state` hoặc param tự định nghĩa trong `redirect_uri` để khớp `authorization code` nhận về với đúng `code_verifier` đã tạo.

### Bước 2: Thiết lập đường dẫn yêu cầu cấp quyền

Trên `developers.zalo.me`, thiết lập:
- Callback URL (nơi nhận `authorization code`)
- `code_challenge` từ bước 1
- Chọn các nhóm quyền cần: Gửi tin & thông báo qua OA, Quản lý tin nhắn người dùng, Quản lý thông tin OA, Quản lý ads, Quản lý bài viết, Quản lý cửa hàng/đơn hàng, Sử dụng chức năng gọi thoại, Nhận sự kiện quản lý tin nhắn, Nhận sự kiện quản lý người dùng.

### Bước 3: Gửi link cho Admin OA để lấy `authorization code`

Gửi đường dẫn cấp quyền cho Admin OA. Sau khi Admin chọn OA và bấm "Cho phép", trình duyệt redirect về callback URL:

```
https://yourdomain.com/abc?code=<AUTHORIZATION_CODE>&oa_id=<OA_ID>
```

`authorization code` chỉ dùng được **1 lần**, hiệu lực **10 phút**. Mỗi OA có giới hạn số App được ủy quyền.

### Bước 4: Đổi `authorization code` lấy `access_token`

```
POST https://oauth.zaloapp.com/v4/oa/access_token
Content-Type: application/x-www-form-urlencoded
Header: secret_key: <your_secret_key>

body (urlencoded):
  code=<authorization_code>
  app_id=<app_id>
  grant_type=authorization_code
  code_verifier=<code_verifier>   # bắt buộc nếu bước 2 có code_challenge
```

Response:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": "90000"
}
```
`access_token`: hiệu lực **25 giờ**. `refresh_token`: hiệu lực **3 tháng**, chỉ dùng được **1 lần**.

Ví dụ code (Node.js):
```js
async function getOaAccessToken(code, codeVerifier) {
  const response = await axios.post(
    "https://oauth.zaloapp.com/v4/oa/access_token",
    new URLSearchParams({ app_id: APP_ID, code, grant_type: "authorization_code", code_verifier: codeVerifier }),
    { headers: { secret_key: SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data.access_token;
}

async function getOaInfo(accessToken) {
  const response = await axios.get("https://openapi.zalo.me/v2.0/oa/getoa", {
    headers: { access_token: accessToken },
  });
  return response.data;
}
```

### Bước 5: Refresh access token khi hết hạn

```
POST https://oauth.zaloapp.com/v4/oa/access_token
Content-Type: application/x-www-form-urlencoded
Header: secret_key: <your_secret_key>

body:
  refresh_token=<refresh_token>
  app_id=<app_id>
  grant_type=refresh_token
```

Response giống bước 4 (access_token mới + refresh_token mới). **`refresh_token` cũ bị vô hiệu ngay khi refresh_token mới được cấp** — luôn lưu lại giá trị mới nhất. Nếu refresh_token hết hạn (quá 3 tháng không dùng), phải xin lại `authorization_code` từ đầu.

## Cách 2 — Zalo API Explorer (thủ công, khi bạn là Admin OA/App)

1. Vào **Công cụ & Hỗ trợ → API Explorer** trên `developers.zalo.me`.
2. Chọn Ứng dụng → Loại Access Token = **OA Access Token** → chọn OA.
3. Kiểm tra quyền yêu cầu → **Cho phép**.
4. Copy `access_token` (và `refresh_token` nếu cần) dùng trực tiếp.

Chỉ phù hợp test/thủ công, không dùng cho vận hành tự động.

## Giới hạn tốc độ gọi API (Rate limit)

Tính theo **phút**, reset ở phút tiếp theo. Vượt giới hạn → response trả `error code = -32`.

- **Official Account API**: 4.000 requests/phút
- **Article API**: 4.000 requests/phút
- **Social API**: 4.000 requests/phút **và** 20 requests/user/phút

Giới hạn theo Official Account còn phụ thuộc gói dịch vụ OA (xem bảng giá `zalo.solutions/oa/pricing`). Giới hạn này **không** áp dụng cho API gửi tin ZBS Template Message qua SĐT.

Mọi response đều có header `X-RateLimit-Limit` (tổng lệnh gọi/phút) và `X-RateLimit-Remain` (còn lại) — `0` nghĩa là đã chạm giới hạn.

**Cách tránh rate limit**: trải đều request qua nhiều khung thời gian (đặc biệt khi import dữ liệu hàng loạt), luôn xử lý lỗi `code = -32` bằng retry có backoff.
