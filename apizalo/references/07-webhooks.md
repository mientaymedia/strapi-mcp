# Webhook — sự kiện từ Zalo OA

## Cấu hình & yêu cầu

- Zalo gửi `POST` tới Webhook URL đăng ký khi có tương tác người dùng hoặc thay đổi liên quan OA (tin nhắn, bài viết, Zalo Shop...).
- Webhook URL nên dùng **domain + HTTPS**, không dùng `host:port`.
- Tại trang cài đặt App: nhấn "Thay đổi" để nhập URL; bật "Lọc cú pháp" nếu chỉ muốn nhận tin bắt đầu bằng `#`; bật từng Event Webhook muốn nhận.
- **OA phải cấp `Official_Account_Access_Token`** cho App liên kết mới nhận được sự kiện (xem `01-auth.md`).

### Yêu cầu hiệu suất
- Phản hồi **mọi** sự kiện với **HTTP 200** trong **tối đa 2 giây**. Không đạt → Admin nhận thông báo webhook không hoạt động qua Zalo cá nhân.

### Retry
Zalo gửi lại sự kiện gửi thất bại (không mở được connection) theo các mốc: **30 giây, 5 phút, 15 phút, 30 phút, 1 giờ**. Request retry có thêm header `num_retry` (số lần đã gửi lại). Không khắc phục kịp trong các mốc này → App bị **hủy đăng ký nhận webhook**, cần vào trang cài đặt App xin cấp quyền nhận sự kiện lại.

## Xác thực chữ ký

Mọi request webhook có header:
```
X-ZEvent-Signature: mac = sha256(appId + data + timeStamp + OAsecretKey)
```
`data` là chuỗi JSON body trả về. **Lưu ý: khác công thức HMAC của `zoaSdk.getSessionInfo()`** trong ZOA Extension (xem `08-extension-zoa.md`) — công thức webhook **có** `timeStamp`, còn Extension **không có**.

---

## Nhóm: Tin nhắn 1-1

### Người dùng gửi tin nhắn — `event_name: user_send_*`

```json
{
  "app_id": "360846524940903967",
  "sender": {"id": "246845883529197922"},
  "user_id_by_app": "552177279717587730",
  "recipient": {"id": "388613280878808645"},
  "event_name": "user_send_text",
  "message": {"text": "message", "msg_id": "96d3cdf3af150460909"},
  "timestamp": "154390853474"
}
```
`event_name`: `user_send_text`|`user_send_image`|`user_send_link`|`user_send_audio`|`user_send_video`|`user_send_sticker`|`user_send_location`|`user_send_business_card`|`user_send_file`. Nếu là tin đa phương tiện → thêm `message.attachments[]` (cấu trúc theo loại, xem mục "Cấu trúc attachments" cuối file). Nếu có `quote_msg_id` → tin gửi qua "Trả lời".

### OA gửi tin nhắn — `event_name: oa_send_*`

```json
{
  "app_id": "...", "sender": {"id": "<oa_id>", "admin_id": "<chỉ có nếu gửi qua tool chat oa.zalo.me/chatv2>"},
  "recipient": {"id": "<user_id>"}, "event_name": "oa_send_text",
  "message": {"text": "message", "msg_id": "..."}, "user_id_by_app": "...", "timestamp": "..."
}
```
`event_name`: `oa_send_text`|`oa_send_image`|`oa_send_gif`|`oa_send_list`|`oa_send_file`|`oa_send_sticker`. Tin `list`/template có thêm cấu trúc `zinstant_id`/`link_url`/`checksum` trong attachment.

### Người dùng ẩn danh gửi/nhận tin — `event_name: anonymous_send_*` / `oa_send_anonymous_*`

Dùng `conversation_id` thay vì user thường. `event_name`: `anonymous_send_text|image|file|sticker`, hoặc chiều OA gửi: `oa_send_anonymous_text|image|file|sticker`. Body có thêm `message.conversation_id`.

### Trạng thái tin nhắn

- `user_seen_message`: user đã xem tin (chỉ Zalo Mobile, chỉ gửi cho App đã gửi tin đó). `message.msg_ids: []` (danh sách các tin đã xem).
- `user_received_message`: tin đã đến máy user (chỉ Zalo Mobile). `message.msg_id`.

### React cảm xúc

- `user_reacted_message`: user thả cảm xúc (chỉ Zalo Mobile). `message: {msg_id, react_icon}`.
- `oa_reacted_message`: OA thả cảm xúc lên tin user.

### Click nút "Nhắn tin"

`user_click_chatnow`: gửi **1 lần/user/OA**, chỉ khi user chưa từng chat với OA. Sau sự kiện này OA được phép gửi tin chủ động. Body: `oa_id`, `user_id`, `user_id_by_app`.

---

## Nhóm: Nhóm chat GMF

| `event_name` | Ý nghĩa | Field đặc thù |
|---|---|---|
| `create_group` | Tạo nhóm mới | `group_id` |
| `user_join_group` | User tham gia nhóm | `users: [{id}]` |
| `user_request_join_group` | User yêu cầu tham gia | `users: [{id}]` |
| `accept_request_join_group` | Duyệt thành viên | `users: [{id}]` |
| `reject_request_join_group` | Từ chối thành viên | `users: [{id}]` |
| `add_group_admin` | Thêm phó nhóm | `users: [{id}]` |
| `remove_group_admin` | Xóa phó nhóm | `users: [{id}]` |
| `update_group_info` | Cập nhật thông tin nhóm | — |
| `user_out_group` | Thành viên rời nhóm | `users: [{id}]` |
| `delete_group` | Giải tán nhóm | — |

Mọi event trên đều có `oa_id`, `group_id`, `app_id`, `timestamp`.

### Tin nhắn gửi tới nhóm

`event_name`: `user_send_group_text|image|link|audio|video|business_card|sticker|gif|file` (chiều user) hoặc `oa_send_group_*` (chiều OA). Body thêm `sender.id`, `recipient.id` (=group_id), `oa_id`, `message.text`+`msg_id`, và có thể có `[@group_id]`/`[@user_id]`/`[@oa_id]` (mention) trong `text`, hoặc `quote_msg_id`.

---

## Nhóm: Gọi thoại (xem chi tiết `04-calling-zcc.md`)

- `oa_send_consent`: yêu cầu quyền gọi vừa gửi/hết hạn. Field: `phone`, `request_type` (`SENT`|`EXPIRED`), `create_time`, `expired_time`.
- `user_reply_consent`: user phản hồi. `user_consent`: `ALLOW`|`USER_BLOCKED`. `confirmed_time`, `expired_time` (0 = không giới hạn thời gian gọi).
- `user_call_oa` / `oa_call_user`: kết thúc cuộc gọi. Field: `user_id`/`phone`, `call_id`, `call_type` (`AUDIO`|`VIDEO`), `init_time`, `call_duration` (ms), `waiting_time` (giây), `talk_time` (ms), `status_code`.

---

## Nhóm: Tương tác OA & dữ liệu người dùng

| `event_name` | Ý nghĩa | Field đặc thù |
|---|---|---|
| `follow` / `unfollow` | User quan tâm/bỏ quan tâm OA | `follower.id`, `source`: `oa_profile`\|`message_invite`\|`social_plugin` |
| `add_user_to_tag` | Gắn nhãn cho user (hoặc tạo nhãn mới nếu `tag` chỉ có `name`) | `tag: {user_ids, name}` |
| `remove_user_from_tag` | Gỡ nhãn khỏi user | `tag: {user_ids, name}` |
| `remove_tag` | Xóa nhãn | `tag: {name}` |
| `user_submit_info` | User đồng ý & gửi thông tin (qua mẫu yêu cầu thông tin) | `info: {name, phone, user_dob, gender, full_address}` |
| `update_user_info` | Thông tin user được cập nhật | `data.method`: vd `dynamic_url` |
| `user_withdraw` | User yêu cầu quyền chủ thể dữ liệu (rút đồng ý/xóa/hạn chế/phản đối xử lý dữ liệu) — cần xóa dữ liệu tương ứng phía đối tác | `user_id`, `user_id_by_app` |
| `extension_purchased` | OA thanh toán tiện ích (ZOA Extension) thành công — chỉ fire cho đúng `appId`=`extension_id` được mua | `extension_id`, `extension_sub_info: {valid_start_date, valid_through_date, duration_month}` |

---

## Nhóm: Widget cấp tương tác

- `widget_interaction_accepted`: user đồng ý cấp quyền tương tác qua widget. `data: {user_id, user_external_id, url}`.
- `widget_failed_to_sync_user_external_id`: đồng bộ `user_external_id` thất bại. `data: {user_id, user_external_id, message}` — `message` có thể là `"user already has user_external_id"` hoặc `"user_externa_id already belongs to another user"`.

Xem `09-widget-interaction.md`.

---

## Cấu trúc `attachments` (dùng chung cho tin 1-1, ẩn danh, nhóm)

| Loại (`type`) | `payload` |
|---|---|
| `image` | `{thumbnail, url}` |
| `gif` | `{thumbnail, url}` |
| `link` | `{thumbnail, description, url}` |
| `audio` | `{url}` (định dạng `.amr`) |
| `video` | `{url, thumbnail, description}` |
| `sticker` | `{url, id}` |
| `location` | `{coordinates: {latitude, longitude}}` |
| `file` | `{size, name, checksum (MD5), type, url}` |
| Danh thiếp (business card, chỉ tin nhóm) | `type: "link"`, `payload: {thumbnail, description: "{json chứa phone, qrCodeUrl}", url}` |
| Template tin nhắn (`oa_send_text` dạng template) | `payload: {zinstant_id, text, link_url, checksum}` |

Ví dụ ảnh:
```json
"attachments": [{"payload": {"thumbnail": "http://...", "url": "http://..."}, "type": "image"}]
```
