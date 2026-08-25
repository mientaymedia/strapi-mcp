# Nhóm chat GMF (Group Management Function)

Chỉ dành cho OA **xác thực** và đang dùng gói **Nâng cao** hoặc **Premium**. Mọi API dưới đây cần **Quyền quản lý thông tin nhóm**, base path `https://openapi.zalo.me/v3.0/oa/group/*`.

## Tin nhắn nhóm

| Mục | Giá trị |
|---|---|
| Mục đích | Tư vấn khách hàng theo nhóm |
| Đối tượng nhận | Nhóm chat còn hoạt động (`status: enabled`) |
| Điều kiện | OA có `group_id` của nhóm |
| Công cụ | OA OpenAPI, OA Manager (Web/Mini App) |
| Định dạng | Theo định dạng Tư vấn |

Điều kiện: App bật quyền gửi tin, nhóm đang `enabled` (check qua Lấy thông tin nhóm), gửi 24/24, hiển thị Mobile + PC/Web.

### Gửi tin nhóm — `POST v3.0/oa/group/message`

**Text:**
```json
{"recipient": {"group_id": "f414c8f76fa586fbdfb4"}, "message": {"text": "hello from Zalo"}}
```
**File:** `message.attachment = {"type": "file", "payload": {"token": "<token từ upload file>"}}`
**Ảnh:** `message.attachment = {"type": "template", "payload": {"template_type": "media", "elements": [{"media_type": "image", "url"|"attachment_id": "..."}]}}` (kèm `text` làm tiêu đề, ≤2000 ký tự)
**Sticker:** `elements: [{"media_type": "sticker", "attachment_id": "..."}]`
**Mention:** `message.text` chứa cú pháp `[@user_id]` (mention 1 người) hoặc `[@group_id]` (mention cả nhóm):
```json
{"recipient": {"group_id": "..."}, "message": {"text": "hello [@186729651760683225] and [@7967320986128691935] from GroupAPI"}}
```

Response chung: `{"data": {"message_id": "...", "group_id": "..."}, "error": 0}`.

## Tạo nhóm mới

**Luồng**: (1) Lấy hạn mức nhóm (`quota/group`) → nhận danh sách gói kèm `asset_id` khả dụng → (2) Tạo nhóm kèm `asset_id` đó.

```
POST v3.0/oa/group/creategroupwithoa
{
  "group_name": "Tư vấn nha khoa",
  "group_description": "Group tư vấn nha khoa cho các nhân viên",
  "asset_id": "326e977e4d3da463fd2c",
  "member_user_ids": ["186729651760683225"]
}
```
`member_user_ids`: 1-99 người, ít nhất 1 admin OA. Response trả `group_info` đầy đủ (xem "Lấy thông tin nhóm" bên dưới) + `group_link`.

## Lấy thông tin nhóm — `GET v3.0/oa/group/getgroup?group_id=...`

Response 3 phần:
- **`group_info`**: `name`, `avatar`, `group_id`, `group_link`, `group_description`, `status` (`enabled`|`disabled`), `total_member`, `max_member`, `auto_delete_date` (nhóm tự giải tán sau **45 ngày** không gia hạn).
- **`asset_info`**: `asset_type` (`gmf10`|`gmf50`|`gmf100`|`gmf1000` — số thành viên tối đa), `asset_id`, `valid_through`, `auto_renew`.
- **`group_setting`**: `lock_send_msg` (khóa nhắn tin thành viên), `join_appr` (duyệt thành viên mới), `enable_msg_history` (cho thành viên mới đọc tin cũ), `enable_link_join` (tham gia bằng link).

## Cập nhật nhóm — `POST v3.0/oa/group/updateinfo`

Body optional từng field: `group_id` (bắt buộc), `group_name`, `group_avatar`, `group_description`, `lock_send_msg`, `join_appr`, `enable_msg_history`, `enable_link_join`. Response giống "Lấy thông tin nhóm".

## Cập nhật dịch vụ nhóm (tăng hạn mức / gia hạn) — `POST v3.0/oa/group/updateasset`

```json
{"group_id": "513c4f117a479319ca56", "asset_id": "<asset_id mới từ quota/group>"}
```

## Quản lý thành viên

| Hành động | API | Ghi chú |
|---|---|---|
| Mời tham gia | `POST v3.0/oa/group/invite` — `{group_id, member_user_ids}` | `user_id` phải là người quan tâm OA hoặc tương tác 7 ngày gần nhất |
| Danh sách chờ duyệt | `GET v3.0/oa/group/listpendinginvite?group_id=&offset=&count=` | |
| Duyệt thành viên | `POST v3.0/oa/group/acceptpendinginvite` — `{group_id, member_user_ids}` | |
| Từ chối thành viên | `POST v3.0/oa/group/rejectpendinginvite` — `{group_id, member_user_ids}` | |
| Danh sách thành viên | `GET v3.0/oa/group/listmember?group_id=&offset=&count=` | Trả `oa_id`+`name`+`avatar` cho OA, `user_id`+`name`+`avatar` cho user |
| Thêm phó nhóm | `POST v3.0/oa/group/addadmins` — `{group_id, member_user_ids}` | |
| Xóa phó nhóm | `POST v3.0/oa/group/removeadmins` — `{group_id, member_user_ids}` | |
| Xóa khỏi nhóm | `POST v3.0/oa/group/removemembers` — `{group_id, member_user_ids}` | |
| Giải tán nhóm | `POST v3.0/oa/group/delete` — `{group_id}` | |

## Danh sách nhóm OA đang quản lý — `GET v3.0/oa/group/getgroupsofoa?offset=&count=`

Trả `groups[]` (mỗi phần tử giống `group_info` rút gọn) + `total`.

## Kiểm tra hạn mức nhóm — `POST v3.0/oa/quota/group`

```json
{"quota_owner": "OA", "product_type": "gmf10", "quota_type": "sub_quota"}
```
`product_type`: `gmf10`|`gmf50`|`gmf100` (số thành viên tối đa). `quota_type`: `sub_quota` (gói OA)|`purchase_quota` (mua lẻ)|`reward_quota` (được tặng). Response mỗi asset: `asset_id`, `valid_through`, `auto_renew`, `status` (`available`|`used`), `used_id` (group_id đang dùng nếu `used`).

## Lịch sử chat nhóm

| API | Method | Mô tả |
|---|---|---|
| `v3.0/oa/group/listrecentchat?offset=&count=` | GET | Tin nhắn gần nhất **trên mọi nhóm** OA quản lý |
| `v3.0/oa/group/conversation?group_id=&offset=&count=` | GET | Tin nhắn trong **1 nhóm** cụ thể |

Cấu trúc response giống lịch sử chat 1-1 (xem `02-messaging.md` mục 10), thêm field `group_id`.

## Sản phẩm Quota GMF (mua qua luồng Purchase — xem `06-user-management.md`)

| product_id | Tên |
|---|---|
| `739448264820568793` | GMF tối đa 10 thành viên |
| `2405469629611791306` | GMF tối đa 50 thành viên |
| `2275350247265190619` | GMF tối đa 100 thành viên |
| `3678557233392100095` | GMF tối đa 1000 thành viên |
