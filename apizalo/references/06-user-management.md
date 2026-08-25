# Quản lý người dùng, nhãn & thông tin OA

Dùng để tổng hợp/lưu trữ thông tin khách hàng đã tương tác OA (CRM/CDP), phân nhóm (nhãn), gắn cờ chăm sóc, quản lý nhiều OA (chuỗi/agency).

## Gắn/gỡ/xóa Nhãn (Tag)

Cần **Quyền quản lý thông tin OA**.

| Hành động | API | Body |
|---|---|---|
| Gắn nhãn | `POST v2.0/oa/tag/tagfollower` | `{"user_id": <long>, "tag_name": "..."}` — nhãn chưa tồn tại sẽ tự tạo |
| Gỡ nhãn | `POST v2.0/oa/tag/rmfollowerfromtag` | `{"user_id": <long>, "tag_name": "..."}` |
| Danh sách nhãn của OA | `GET v2.0/oa/tag/gettagsofoa` | → `{"data": ["Khách Q1", "Khách Q2"]}` |
| Xóa nhãn | `POST v2.0/oa/tag/rmtag` | `{"tag_name": "..."}` |

## Quản lý người dùng (API hiện hành — `v3.0`)

Cần **Quyền quản lý thông tin người dùng**. Các API `v2.0` (`getfollowers`, `getprofile`, `updatefollowerinfo`) **đã dừng hỗ trợ OA Doanh nghiệp từ 01/06/2024** — dùng bộ `v3.0` dưới đây.

### Truy xuất danh sách — `GET v3.0/oa/user/getlist?data={...}`

```json
{"offset": 0, "count": 15, "last_interaction_period": "TODAY", "is_follower": "true"}
```
- `offset`: tối đa 9951 (10.000 user, 50 user/request). `count`: tối đa 50/request.
- `tag_name` (optional): lọc theo nhãn.
- `last_interaction_period` (optional): `TODAY`|`YESTERDAY`|`L7D`|`L30D`|`<YYYY_MM_DD:YYYY_MM_DD>`.
- `is_follower` (optional): `true`|`false`.

Response: `{"data": {"total", "count", "offset", "users": [{"user_id"}]}}`.

### Truy xuất chi tiết — `GET v3.0/oa/user/detail?data={"user_id":"..."}`

Response gồm: `user_id`, `user_id_by_app`, `user_external_id` (id trong hệ thống DN, `""` nếu chưa set), `display_name`, `user_alias`, `is_sensitive` (dưới 18 tuổi), `user_last_interaction_date` (dd/MM/yyyy), `user_is_follower`, `avatar`, `avatars.{120,240}`, `dynamic_param` (Dynamic URL cuối truy cập), `tags_and_notes_info.{notes, tag_names}`, `shared_info` (dữ liệu user đã submit qua mẫu yêu cầu thông tin — `address`, `city`, `district`, `phone`, `name`).

### Cập nhật — `POST v3.0/oa/user/update`

```json
{
  "user_id": "4064634764263601113",
  "shared_info": {"name": "...", "phone": "...", "address": "...", "city_id": <int>, "district_id": <int>, "user_dob": "31/12/1999"},
  "user_alias": "Alias name",
  "user_external_id": "ED123mi09hfh"
}
```
`user_dob` chỉ hỗ trợ từ `1/1/1970`.

### Xóa thông tin (dữ liệu phía OA, không đổi tài khoản Zalo user) — `POST v2.0/oa/deletefollowerinfo`
```json
{"user_id": "2512523625412515"}
```

## Trường thông tin tùy biến (Custom Info)

Cần quyền riêng trong nhóm **"Quản lý thông tin tùy biến của người dùng"**.

### Lấy thông tin tùy biến — `GET v3.0/oa/user/detail/custominfo?data={...}`
```json
{"user_id": "4572947693969771653", "fields_to_export": ["first_name", "email"]}
```
`fields_to_export` optional (không truyền = trả hết). Field kiểu `table` chỉ cần khai báo field cha, trả về đủ field con. Response gồm field hệ thống (`name`, `phone`, `user_dob`, `gender`, `full_address`, `user_external_id`, `dynamic_param`) + `custom_info` (mọi giá trị trả về dạng **string**, kể cả `boolean`/`number`, để đảm bảo nhất quán).

### Cập nhật thông tin tùy biến — `POST v3.0/oa/user/update/custominfo`
```json
{
  "user_id": "...",
  "name": "...", "phone": "...", "user_dob": "30/10/1999", "gender": "Nam",
  "full_address": {"user_city_id": "79", "user_ward_id": "27343", "user_address": "123 Trần Hưng Đạo"},
  "user_external_id": "...",
  "custom_info": {"isActiveUser_boolean": "true", "loyaltyPoints_number": "2500", "orderInfo_table": {"orderId": "...", "amount": "100000"}}
}
```
`gender` chỉ nhận `Nam`|`Nữ`|`Khác`. `full_address` dùng mã Tỉnh/Thành-Phường/Xã theo đơn vị hành chính mới.

### Quản lý định nghĩa trường (schema)

| API | Method | Ghi chú |
|---|---|---|
| `v3.0/oa/userfield/get` | GET | `field_type` (`system`\|`oa_custom`) và/hoặc `fields_to_get` để lọc |
| `v3.0/oa/userfield/create` | POST | Tạo field mới — `key` và `data_type` **không đổi được sau khi tạo** |
| `v3.0/oa/userfield/update` | POST | Không đổi `key`/`data_type`; `table` chỉ được **thêm** key mới, không xóa |
| `v3.0/oa/userfield/delete` | POST | Chỉ xóa field `field_type: oa_custom` (không xóa field `system`) |

### Các `data_type` hỗ trợ

| Type | Giới hạn |
|---|---|
| `boolean` | `true`/`false` |
| `number` | Số nguyên hoặc thập phân tối đa 3 chữ số sau dấu phẩy |
| `text` | ≤255 ký tự |
| `datetime` | Xem bảng format bên dưới |
| `table` | JSON 1 cấp, tối đa 5 cặp key-value, key không xóa/sửa được sau khi tạo |
| `email` | vd `abc@example.com` |
| `phone` | `country_code + phone_number`, vd `849xxxxxxxx` |
| `url` | Bắt đầu `http://` hoặc `https://` |

### Format `datetime`

| Format | Ví dụ |
|---|---|
| `dd/MM/yyyy` | 31/12/2023 |
| `dd/MM/yyyy HH:mm:ss` | 31/12/2023 23:59:59 |
| `dd-MM-yyyy` | 31-12-2023 |
| `dd-MM-yyyy HH:mm:ss` | 31-12-2023 23:59:59 |
| `yyyy-MM-dd` | 2023-12-31 |
| `yyyy-MM-ddTHH:mm:ss` | 2023-12-31T23:59:59 |

Nhập datetime: theo đúng định dạng hiển thị đã khai báo, hoặc theo **timestamp giây**. Thiếu TIME → mặc định `00:00:00`; thiếu giây → `00`; thiếu timezone → mặc định UTC+7.

## Kiểm tra hạn mức tin nhắn OA (tổng hợp) — `POST v3.0/oa/quota/message`

Xem chi tiết ở `02-messaging.md` mục 9 (dùng chung endpoint, filter theo `product_type`: `cs`|`transaction`).

## Lấy thông tin OA — `GET v2.0/oa/getoa`

Response: `oaid`, `name`, `description`, `oa_alias`, `is_verified`, `oa_type` (`2`: Doanh nghiệp, `4`: Cơ quan nhà nước), `cate_name`, `num_follower`, `avatar`, `cover`, `package_name`, `package_valid_through_date`, `package_auto_renew_date`, `linked_ZCA`.

## Lấy nội dung form Zalo Ads (leads) — `GET v2.0/oa/form/get`

```
?form_id=<FORM_ID>&from_time=<ts>&to_time=<ts>&offset=0&limit=200
```
Cần **Quyền quản lý ads**. Khoảng `from_time`→`to_time` ≤30 ngày, `limit` tối đa 200. Response: `questions[]` (`questionId`, `title`), `responses[]` (`leadId` — noised, đổi mỗi lần submit; `submitTime`; `adId`; `answers[]` theo `questionId`).

## Luồng mua sản phẩm/dịch vụ OA (2 bước, qua ZCA)

1. **Tạo đơn hàng** — `POST v3.0/oa/purchase/create_order`
   ```json
   {"beneficiary": "OA", "product_id": 866836109767958135, "voucher_code": "DISCOUNT_100K"}
   ```
   hoặc dùng `redeem_code` thay `product_id` (1 trong 2). Response trả `order_id`, `verified_token` (**OTT**, hiệu lực **5 phút**), `amount`, `final_amount`, `zca_id`. **Chưa** trừ tiền ở bước này.
2. **Xác nhận thanh toán** — `POST v3.0/oa/purchase/confirm_order`
   ```json
   {"order_id": "22ffed32d17738296161", "verified_token": "30fVkXZd9j9zWmqQrBhO"}
   ```
   Lúc này mới thực sự mua + trừ tiền ZCA.

Cần **Quyền quản lý Mua sản phẩm dịch vụ OA**. Order chỉ tạo được từ 00:01 đến 23:54.

### Bảng `product_id` (OA Subscription)

| product_id | Gói |
|---|---|
| `866836109767958135` | Nâng cao 6 tháng *(dừng cung cấp 01/06/2026)* |
| `1302963828004138542` | Nâng cao 12 tháng *(dừng 01/06/2026)* |
| `757295129578622372` | Premium 6 tháng *(dừng 01/06/2026)* |
| `3071996459978068910` | Premium 12 tháng *(dừng 01/06/2026)* |
| `2986218846231350366` | Tiêu chuẩn 12 tháng |
| `432116103399624767` | Tăng trưởng 6 tháng |
| `3521678227011222721` | Tăng trưởng 12 tháng |
| `2519724963880150161` | Toàn diện 6 tháng |
| `3949230607632876067` | Toàn diện 12 tháng |

Sản phẩm Quota GMF: xem `03-groups-gmf.md`.
