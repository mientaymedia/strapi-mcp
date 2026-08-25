# Gửi tin nhắn OA (Messaging)

Mọi endpoint dưới đây cần header `access_token` (xem `01-auth.md`) và `Content-Type: application/json` trừ khi ghi chú khác.

## Tổng quan các loại tin

| Loại | Mục đích | Điều kiện gửi | Chi phí |
|---|---|---|---|
| **Tin Tư vấn (CS)** | Phản hồi/hỗ trợ khách hàng | User tương tác với OA trong 7 ngày gần nhất | Miễn phí trong 48h kể từ tương tác cuối; sau 48h tính phí theo bảng giá |
| **Tin gửi vào Nhóm chat GMF** | Trao đổi trong nhóm | OA đang dùng Nhóm chat GMF | Miễn phí |
| **Tin Broadcast** | Cập nhật đồng loạt tới người quan tâm | User đang quan tâm OA | Miễn phí, giới hạn theo hạn mức gói OA/tháng |
| **ZBS Template Message — Tin Giao dịch** | Xác nhận đơn hàng/lịch hẹn, thông báo giao dịch | User tương tác với OA trong 1 năm gần nhất | Theo template đã duyệt |
| **ZBS Template Message — Tin Truyền thông (Promotion)** | Marketing cá nhân hóa hoặc Broadcast | User đang quan tâm OA (cá nhân) | Theo hạn mức gói + daily/monthly limit |

Tương tác hợp lệ để tính điều kiện gửi tin: gửi tin đến OA, gửi tin trong nhóm GMF, gọi thoại đến OA, đồng ý nhận cuộc gọi, comment bài viết, tương tác OA Chatbot, nhấn Menu/CTA query hoặc Widget của OA, quan tâm OA, nhấn nút Nhắn tin.

**Cấu trúc chung mọi request gửi tin**: `{"recipient": {...}, "message": {...}}`, response luôn có `data.message_id`.

## 1. Tin Tư vấn (CS) — `v3.0/oa/message/cs`

Endpoint chung cho mọi loại tin Tư vấn:
```
POST https://openapi.zalo.me/v3.0/oa/message/cs
```

### Văn bản
```json
{ "recipient": {"user_id": "2512523625412515"}, "message": {"text": "hello, world!"} }
```
`text` tối đa 2.000 ký tự.

### Đính kèm ảnh
```json
{
  "recipient": {"user_id": "2468458835296117922"},
  "message": {
    "text": "Zalo đạt 100 triệu người dùng",
    "attachment": {"type": "template", "payload": {
      "template_type": "media",
      "elements": [{"media_type": "image", "url": "https://.../bg_1.jpg"}]
    }}
  }
}
```
`media_type`: `image` | `gif` (cần thêm `width`/`height` khi gif). Dùng `attachment_id` (từ API upload ảnh) **hoặc** `url`, không cả hai. Ảnh: jpg/png, tối đa 1MB, tỉ lệ tối ưu 16:9 (safe zone 14:9).

### Đính kèm file
Cần `token` từ API upload file trước:
```json
{ "recipient": {"user_id": "..."}, "message": {"attachment": {"type": "file", "payload": {"token": "<token>"}}} }
```

### Kèm Sticker
```json
{ "recipient": {"user_id": "..."}, "message": {"attachment": {"type": "template", "payload": {
  "template_type": "media", "elements": [{"media_type": "sticker", "attachment_id": "<sticker_id>"}]
}}} }
```
Lấy sticker id từ `stickers.zaloapp.com`.

### Theo mẫu yêu cầu thông tin người dùng
```json
{ "recipient": {"user_id": "..."}, "message": {"attachment": {"type": "template", "payload": {
  "template_type": "request_user_info",
  "elements": [{"title": "OA Chatbot", "subtitle": "Đang yêu cầu thông tin từ bạn", "image_url": "..."}]
}}} }
```
`title` ≤100 ký tự, `subtitle` ≤500 ký tự, tối đa 1 element. Khi user điền và gửi → webhook `user_submit_info` (xem `07-webhooks.md`).

### Trích dẫn (quote)
```json
{ "recipient": {"user_id": "..."}, "message": {"text": "...", "quote_message_id": "<msg_id cần trả lời>"} }
```

### Response & `quota` — các biến thể `quota_type`

Response luôn có `data.message_id`, `data.user_id`, `data.sent_time`, và thường có `data.quota` mô tả **nguồn quota** vừa dùng để gửi tin này:

| `quota_type` | Ý nghĩa | Field kèm theo |
|---|---|---|
| `reply` | Tin trong khung 48h kể từ tương tác cuối | `remain`/`total` — từ 1/1/2026 luôn trả `remain=8`; sau 1/3/2026 ngừng trả 2 field này |
| `welcome_msg` | Gửi đến user quan tâm khi chưa từng tương tác | `remain`, `total` (mặc định 3 lượt) |
| `sub_quota` | Trong hạn mức miễn phí theo gói OA | `remain`, `total`, `expired_date` |
| `purchase_quota` | Trong hạn mức mua lẻ tính năng | `owner_type` (OA/App), `owner_id` |
| `reward_quota` | Trong hạn mức Redeem code/khuyến mãi | `owner_type`, `owner_id` |
| *(không có `quota`)* | Tin tính phí — vượt mọi hạn mức miễn phí | — |

## 2. Gửi lệnh phản hồi người dùng — `v3.0/oa/message/cs` (dùng `message_id`)

Phản hồi **tối đa 8 lệnh trong 48h** cho 1 tin nhắn đến (áp dụng cả user đã/chưa quan tâm). Lệnh thứ 9+ hoặc gửi sau 48h → tính là lệnh chủ động, tính phí.

```json
{ "recipient": {"message_id": "468458835"}, "message": {"text": "Bạn cần hỗ trợ gì ạ?"} }
```
Cần lấy `message_id` từ webhook sự kiện người dùng gửi tin nhắn.

## 3. ZBS Template Message — Tin Giao dịch — `v3.0/oa/message/transaction`

```
POST https://openapi.zalo.me/v3.0/oa/message/transaction
```

Điều kiện: App đã bật quyền gửi tin, User tương tác với OA trong **1 năm** gần nhất. Gửi 24/24, out-app notification 6h-21h59, hiển thị trên Mobile (PC/Web coming soon).

⚠️ Từ 01/01/2026, giải pháp ZBS Template Message thay thế Tin UID Giao dịch cũ (165đ) — dịch vụ cũ dừng cấp từ 01/03/2026.

```json
{
  "recipient": {"user_id": "5373093274852641073"},
  "message": {"attachment": {"type": "template", "payload": {
    "template_type": "transaction_order",
    "language": "VI",
    "elements": [
      {"type": "banner", "attachment_id": "<image attachment_id>"},
      {"type": "header", "content": "Trạng thái đơn hàng", "align": "left"},
      {"type": "text", "align": "left", "content": "• Cảm ơn bạn đã mua hàng...<br>• Thông tin đơn hàng..."},
      {"type": "table", "content": [
        {"key": "Mã khách hàng", "value": "F-01332973223"},
        {"key": "Trạng thái", "value": "Đang giao", "style": "yellow"},
        {"key": "Giá tiền", "value": "250,000đ"}
      ]},
      {"type": "text", "align": "center", "content": "📱Lưu ý điện thoại. Xin cảm ơn!"}
    ],
    "buttons": [
      {"title": "Kiểm tra lộ trình", "image_icon": "", "type": "oa.open.url", "payload": {"url": "https://oa.zalo.me/home"}},
      {"title": "Xem lại giỏ hàng", "image_icon": "<attachment_id>", "type": "oa.query.show", "payload": "kiểm tra giỏ hàng"},
      {"title": "Liên hệ tổng đài", "image_icon": "<attachment_id>", "type": "oa.open.phone", "payload": {"phone_code": "84123456789"}}
    ]
  }}}
}
```

### `template_type` (13 loại — "Loại tin")

| Mã | Loại tin (VN) | Type (EN) | Ngành |
|---|---|---|---|
| `transaction_billing` | Hóa đơn | Billing | Tất cả |
| `transaction_order` | Đơn hàng | Order | Tất cả |
| `transaction_reward` | Tích điểm | Reward | Tất cả |
| `transaction_contract` | Hợp đồng | Contract | Tất cả |
| `transaction_booking` | Lịch hẹn | Booking | Tất cả |
| `transaction_membership` | Thành viên | Membership | Tất cả |
| `transaction_event` | Sự kiện | Event | Tất cả |
| `transaction_transaction` | Giao dịch | Transaction | Tất cả |
| `transaction_account` | Tài khoản | Account | Tất cả |
| `transaction_internal` | Nội bộ | Internal | Tất cả |
| `transaction_partnership` | Đối tác | Partnership | Tất cả |
| `transaction_education` | Học vụ | Education | Giáo dục |
| `transaction_rating` | Đánh giá | Rating | Tất cả |

### `elements` (từng type)

- **`banner`**: `image_url` **hoặc** `attachment_id` (jpg/png ≤1MB, tỉ lệ height:width 1:5 → 1:1).
- **`header`**: `content` (≤100 ký tự), `align` (`left`|`center`|`right`, mặc định left).
- **`text`**: tối đa **2 đoạn**; `content` ≤250 ký tự/đoạn (transaction) hoặc ≤1000 ký tự/đoạn (promotion — xem mục 4); `align`.
- **`table`**: mảng `{key, value, style?}`, `key` ≤35 ký tự, `value` ≤100 ký tự. Bắt buộc có 1 trong 2: key bắt đầu bằng "Mã..."/chứa "Code" (định danh khách hàng), hoặc key cố định "Tên khách hàng"/"Customer Name". Riêng key **"Trạng thái"/"Status"** mới được dùng `style`: `green`|`blue`|`yellow`|`red`|`grey`. Ngoài các key hệ thống, được khai báo thêm tối đa **5 phần tử tùy ý**.

### `buttons` (tối đa 4)
`title` ≤35 ký tự, `image_icon` (URL/`attachment_id`/để trống dùng icon mặc định, tối ưu 100×100px), `type`+`payload` (xem bảng action types cuối file).

### Quota response (transaction)
Giống bảng `quota_type` ở mục 1, nhưng **không có** biến thể `reply`/`welcome_msg` (đó là đặc thù tin CS) — chỉ có `purchase_quota`, `reward_quota`, hoặc tin tính phí (không có field `quota`).

## 4. ZBS Template Message — Tin Truyền thông (Promotion) — `v3.0/oa/message/promotion`

```
POST https://openapi.zalo.me/v3.0/oa/message/promotion
```

**Điều kiện chung**: App đã bật quyền, User **đang quan tâm OA**.
- Quota: hạn mức tháng theo gói OA + **daily limit 1 tin/user/ngày**.
- **Daily limit request** (riêng cho Truyền thông cá nhân, không áp dụng Broadcast): OA ≤10.000 follower → 500 request/ngày; OA >10.000 follower → 5% số follower (chốt số follower tại thời điểm gửi tin đầu ngày, reset 00:00 hàng ngày).
- Thời gian gửi: 6h00–21h59 (cả in-app và out-app notification).
- 2 cách dùng: **Tin Truyền thông cá nhân** (theo UID) hoặc **Tin Truyền thông Broadcast** (theo tập người quan tâm, hệ thống xử lý trong ~30 phút trước khi gửi).

⚠️ Cùng lộ trình dừng dịch vụ cũ 01/01/2026 → 01/03/2026 như mục 3.

```json
{
  "recipient": {"user_id": "4356639876691778517"},
  "message": {"attachment": {"type": "template", "payload": {
    "template_type": "promotion",
    "elements": [
      {"type": "banner", "attachment_id": "<attachment_id>"},
      {"type": "header", "content": "💥Ưu đãi thành viên Platinum💥"},
      {"type": "text", "align": "left", "content": "Ưu đãi dành riêng cho khách hàng...<br>Voucher trị giá 150$"},
      {"type": "table", "content": [{"key": "Voucher", "value": "VC09279222"}, {"key": "Hạn sử dụng", "value": "30/12/2023"}]},
      {"type": "text", "align": "center", "content": "Áp dụng tất cả cửa hàng"}
    ],
    "buttons": [
      {"title": "Tham khảo chương trình", "image_icon": "", "type": "oa.open.url", "payload": {"url": "https://oa.zalo.me/home"}},
      {"title": "Liên hệ chăm sóc viên", "image_icon": "<attachment_id>", "type": "oa.query.hide", "payload": "#tuvan"}
    ]
  }}}
}
```
Cấu trúc `elements`/`buttons` giống mục 3, khác: `text.content` tối đa **1000 ký tự**/đoạn, `table` tối đa **5 phần tử** (không có key hệ thống bắt buộc).

## 5. Broadcast bài viết — `v2.0/oa/message`

```
POST https://openapi.zalo.me/v2.0/oa/message
```

Gửi **miễn phí** tối đa **5 bài viết**/lượt tới người quan tâm, lọc theo target. Cần **Quyền gửi tin & thông báo qua OA** + **Quyền quản lý bài viết** (xem `05-articles.md` để tạo bài viết trước). Nội dung kiểm duyệt ~30 phút trước khi gửi.

```json
{
  "recipient": {"target": {"gender": "0", "cities": "4"}},
  "message": {"attachment": {"type": "template", "payload": {
    "template_type": "media",
    "elements": [{"media_type": "article", "attachment_id": "<article_attachment_id>"}]
  }}}
}
```

### `recipient.target` (mọi field optional, giá trị cách nhau bởi `,`)

| Field | Giá trị |
|---|---|
| `ages` | `0`:0-12, `1`:13-17, `2`:18-24, `3`:25-34, `4`:35-44, `5`:45-54, `6`:55-64, `7`:≥65 |
| `gender` | `0`: tất cả, `1`: Nam, `2`: Nữ |
| `locations` | `0`: Miền Bắc, `1`: Miền Trung, `2`: Miền Nam |
| `cities` | Mã tỉnh/thành (bảng bên dưới) — **thay thế** `locations` nếu cả hai cùng set |
| `platform` | `1`: iOS, `2`: Android, `3`: Windows Phone |

### Bảng `recipient.target.cities`

`0`:Đồng Tháp `1`:Bình Phước `2`:Ninh Bình `3`:Bạc Liêu `4`:Hồ Chí Minh `5`:Vĩnh Long `6`:Lâm Đồng `7`:Yên Bái `8`:Hà Nam `9`:Hà Nội `10`:Hải Dương `11`:Hậu Giang `12`:An Giang `13`:Trà Vinh `14`:Tiền Giang `15`:Tây Ninh `16`:Đồng Nai `17`:Đắk Lắk `18`:Bình Định `19`:Kon Tum `20`:Đà Nẵng `21`:Bắc Giang `22`:Bắc Kạn `23`:Điện Biên `24`:Hòa Bình `25`:Thái Bình `26`:Vĩnh Phúc `27`:Hà Giang `28`:Kiên Giang `29`:Bình Dương `30`:Bình Thuận `31`:Đắk Nông `32`:Khánh Hòa `33`:Gia Lai `34`:Quảng Nam `35`:Quảng Trị `36`:Hà Tĩnh `37`:Hưng Yên `38`:Quảng Ninh `39`:Thanh Hóa `40`:Phú Thọ `41`:Lai Châu `42`:Thái Nguyên `43`:Cao Bằng `44`:Cà Mau `45`:Cần Thơ `46`:Sóc Trăng `47`:Bến Tre `48`:Long An `49`:Bà Rịa Vũng Tàu `50`:Ninh Thuận `51`:Phú Yên `52`:Quảng Ngãi `53`:Thừa Thiên Huế `54`:Quảng Bình `55`:Nghệ An `56`:Nam Định `57`:Hải Phòng `58`:Lạng Sơn `59`:Lào Cai `60`:Sơn La `61`:Bắc Ninh `62`:Tuyên Quang `63`:Không thuộc VN

## 6. Tin nhắn đến người dùng ẩn danh — `v2.0/oa/message`

Dùng `anonymous_id` + `conversation_id` thay cho `user_id`:
```json
{ "recipient": {"anonymous_id": "1ffedc467f179649cf06", "conversation_id": "fa8f3f8701c2e89cb1d3"}, "message": {"text": "hello, world!"} }
```
Hỗ trợ: text, ảnh (`media_type: image` + `url`), file (`type: file` + `token`), sticker (`media_type: sticker` + `attachment_id`). Response trả thêm `anonymous_id`, `conversation_id`.

## 7. React cảm xúc & Trả lời (quote) — `v2.0/oa/message`

### Thả cảm xúc
```json
{ "recipient": {"user_id": "..."}, "sender_action": {"react_icon": "/-strong", "react_message_id": "<msg_id>"} }
```
Icon hỗ trợ: `:>` `--b` `:-((` `/-strong` `/-heart` `:-h` `:o` `/-remove` (thu hồi). 1 `message_id` tối đa **50** react. **Không** tính vào quota chủ động.

### Trả lời (quote)
```json
{ "recipient": {"user_id": "..."}, "message": {"text": "quote tin nhan ne", "quote_message_id": "<msg_id>"} }
```

## 8. Upload media (dùng cho attachment_id/token ở trên)

| API | Method | Định dạng | Giới hạn |
|---|---|---|---|
| `v2.0/oa/upload/image` | POST multipart | jpg, png | ≤1MB |
| `v2.0/oa/upload/file` | POST multipart | PDF/DOC/DOCX/CSV | ≤5MB |
| `v2.0/oa/upload/gif` | POST multipart | gif | ≤5MB |

Quota mỗi API: **5.000 request/tháng**. File/ảnh lưu server tối đa **7 ngày** sau khi gửi. Response: `{"data": {"attachment_id": "..."}}` (ảnh/gif) hoặc `{"data": {"token": "..."}}` (file).

## 9. Kiểm tra hạn mức tin nhắn

### Theo tin cụ thể (cũ) — `v2.0/oa/quota/message`
- Không truyền `message_id` → quota lệnh chủ động: `{"data": {"type": "active", "remain": 450, "total": 1000}}`.
- Truyền `{"message_id": "..."}` → quota lệnh phản hồi (reply, trong 48h).

### Theo User cụ thể (mới, chi tiết hơn) — `v3.0/oa/quota/message`
```
POST v3.0/oa/quota/message
body: {"user_id": "3665924733554159312"}
```
Trả về `last_interaction` (timestamp tương tác cuối), `cs_reply.remain/total`, `promotion.daily_remain/daily_total/monthly_remain/monthly_total`. User không cần đang quan tâm OA.

### Tổng hợp theo loại/nguồn — `v3.0/oa/quota/message`
```json
{"quota_owner": "OA", "product_type": "cs", "quota_type": "sub_quota"}
```
`quota_owner`: `OA`|`APP`. `product_type` (optional): `cs`|`transaction`. `quota_type` (optional): `sub_quota`|`purchase_quota`|`reward_quota`. Trả về mảng các `asset_id` kèm `valid_through`, `total`, `remain`.

## 10. Lịch sử chat 1-1

| API | Method | Mô tả |
|---|---|---|
| `v2.0/oa/listrecentchat?data={"offset":0,"count":5}` | GET | Tối đa 10 tin nhắn gần nhất giữa OA và tất cả user |
| `v2.0/oa/conversation?data={"user_id":...,"offset":0,"count":5}` | GET | Tối đa 10 tin nhắn/request trong 1 hội thoại cụ thể |

Response mỗi tin nhắn: `message_id`, `src` (0=OA gửi, 1=user gửi), `time`, `type` (text/voice/photo/GIF/link/links/sticker/location), `message`, `from_id`/`to_id`, `from_display_name`/`to_display_name`, `from_avatar`/`to_avatar`, và field riêng theo `type` (`url`, `thumb`, `description`, `location`, `links`).

## Cấu trúc `buttons` (dùng cho tin thường, tối đa 5 button)

```json
{"title": "OPEN URL", "type": "oa.open.url", "payload": {"url": "https://developers.zalo.me/"}}
```

## Bảng action types (`buttons` và `elements.default_action`)

| `type` | Kiểu `payload` | Mô tả |
|---|---|---|
| `oa.open.url` | string trong `{"url": "..."}` | Mở URL trong Zalo |
| `oa.query.show` | string, vd `"#123"` | Gửi tin nhắn ẩn trong `payload` từ user → OA, **hiện** trên cửa sổ chat |
| `oa.query.hide` | string | Giống trên nhưng **ẩn** trên cửa sổ chat |
| `oa.open.sms` | `{"content": "...", "phone_code": "84..."}` | Mở khung SMS soạn sẵn nội dung + số |
| `oa.open.phone` | `{"phone_code": "84..."}` | Mở khung gọi điện với số sẵn |

Giới hạn `title` ≤100 ký tự (buttons tin thường; ZBS template ≤35 ký tự), `oa.query.*` payload ≤1000 ký tự, `oa.open.sms.content` ≤160 ký tự.

## Cấu trúc `elements` (dùng cho template `list`, tối đa 5 phần tử)

```json
{
  "title": "Official Account API",
  "subtitle": "There Is No Limit To What You Can Accomplish Using Zalo",
  "image_url": "https://...",
  "default_action": {"type": "oa.open.url", "url": "https://developers.zalo.me/docs/api/official-account-api-147"}
}
```
`title` ≤100 ký tự, `subtitle` ≤500 ký tự (bắt buộc nếu là element đầu tiên). `default_action` không bắt buộc cho element đầu tiên, dùng cùng bảng action types ở trên (lưu ý: format ở đây `{"type":..., "url":...}` phẳng, không lồng trong `payload` như buttons).

## Gửi thông báo theo mẫu đính kèm danh sách (`template_type: list`) — `v2.0/oa/message`

```json
{
  "recipient": {"user_id": "..."},
  "message": {"attachment": {"type": "template", "payload": {
    "template_type": "list",
    "elements": [ /* xem cấu trúc elements ở trên, tối đa 5 */ ]
  }}}
}
```
Ảnh tối ưu: element chính 500×320px, element phụ 50×50px. Cũng hỗ trợ list of `button` (chỉ mobile) thay vì list of `elements`.
