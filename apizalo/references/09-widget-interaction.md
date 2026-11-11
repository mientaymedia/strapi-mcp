# Widget cấp tương tác (website)

Widget nhúng trên **website** của doanh nghiệp — khác Mini App và ZOA Extension — giúp Doanh nghiệp xin quyền tương tác từ khách truy cập website để gửi thông báo Zalo (qua Official Account) về các giao dịch phát sinh.

## Luồng Xin quyền & Gửi tin nhắn

```
Người dùng               Hệ thống Doanh nghiệp (App)          Hệ thống Zalo
    │                              │                               │
 truy cập Website                  │                               │
    │──(1) Hiển thị Widget cấp tương tác──────────────────────────>│
 đồng ý cấp tương tác              │                               │
    │──────────────────────────────>│                              │
    │                    (2) Gửi sự kiện: đồng ý + kết quả          │
    │                        đồng bộ User_external_id ─────────────>│
    │                              │  (3) Nhận sự kiện, gửi thông   │
    │                              │      báo đến người dùng         │
    │<─────────────────────────────┼───────────────────────────────│
    │  (4) Hiển thị thông báo Quan tâm OA (nếu chưa quan tâm)        │
 Quan tâm OA                       │                               │
```

1. Hiển thị Widget cấp tương tác trên website (hướng dẫn cài đặt widget — xem docs cài đặt widget riêng, ngoài phạm vi skill này).
2. User đồng ý → sự kiện "đồng ý cấp tương tác" + kết quả đồng bộ `user_external_id` được gửi tới hệ thống Zalo.
3. Doanh nghiệp gọi API **Tin Giao dịch** (xem `02-messaging.md` mục 3) để gửi thông báo (vd trạng thái đơn hàng) đến user qua OA.
4. Nếu user chưa quan tâm OA, hệ thống hiển thị thêm lời mời Quan tâm OA.

### Ví dụ ứng dụng
- **Đặt hàng/đặt bàn thành công**: khách chốt đơn trên web + đồng ý cấp tương tác → OA gửi tin Giao dịch xác nhận trạng thái đơn/đặt bàn.
- **Bỏ quên giỏ hàng (abandoned cart)**: khách có sản phẩm trong giỏ chưa thanh toán → OA gửi tin Giao dịch nhắc nhở.

## Webhook liên quan (xem `07-webhooks.md`)

- `widget_interaction_accepted`: user đồng ý cấp quyền — trả `user_id` (id Zalo), `user_external_id` (id trong hệ thống DN), `url` (trang user thực hiện cấp quyền).
- `widget_failed_to_sync_user_external_id`: đồng bộ `user_external_id` thất bại — trả `message` mô tả lý do (`user already has user_external_id` hoặc `user_externa_id already belongs to another user`).

## Bước tiếp theo sau khi có `user_external_id`

Dùng `user_id`/`user_external_id` nhận được để gọi API **Tin Giao dịch** (`v3.0/oa/message/transaction`, xem `02-messaging.md`) gửi thông báo giao dịch tương ứng — đây là lý do chính doanh nghiệp tích hợp widget này: có kênh Zalo chính thức để báo trạng thái đơn hàng mà không cần chờ user tự quan tâm OA trước.
