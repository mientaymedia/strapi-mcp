# Gọi thoại qua OA — Zalo Cloud Connect (ZCC)

## Tổng quan

Gọi thoại/video giữa OA và người dùng Zalo. 2 cách triển khai:
1. **Mini Call Center (MCC)** — tổng đài tích hợp sẵn trong OA Manager.
2. **Zalo Cloud Connect (ZCC)** — kết nối tổng đài SIP có sẵn của doanh nghiệp, vận hành qua API. Tài liệu này nói về ZCC.

**Inbound** (user gọi OA): miễn phí, mọi lúc. **Outbound** (OA gọi user): cần quyền gọi + trả phí cho mỗi yêu cầu quyền; sau khi user đồng ý, gọi miễn phí trong **30 ngày**.

Ứng dụng: tư vấn sản phẩm/dịch vụ, tư vấn y tế/đào tạo từ xa, liên hệ giao hàng, tuyển dụng, xác nhận lịch hẹn (có thể kết hợp tư vấn tự động + nhân viên).

## Điều kiện thiết lập ZCC

- OA dùng gói **Tăng trưởng** hoặc **Toàn diện**.
- Có sẵn Call Center/tổng đài IP/SBC/Gateway hỗ trợ SIP trunk (audio; thêm hỗ trợ video call + nhận diện khuôn mặt nếu cần video).
- Static IP public, băng thông: audio 100-120kbps/call; video via app 500-1000kbps/call, via web 1000-1200kbps/call.
- Firewall/SBC cho phép gói tin gọi thoại (Trying, Ringing...).

Video call hiện là **tính năng thử nghiệm** — cần gửi mail `oa@zalo.me` (email doanh nghiệp) kèm: tên OA/OAID, gói dịch vụ, lĩnh vực, số lượng cuộc gọi dự kiến, mục đích, cách triển khai.

## Điều kiện App

App cần: (a) bật "Quyền sử dụng chức năng gọi thoại" ở Thiết lập chung, (b) nộp xét duyệt quyền này tại Đăng ký sử dụng API → Official Account API, (c) được **OA cấp quyền** sử dụng chức năng gọi thoại (qua luồng ủy quyền ở `01-auth.md`).

## Các bước kết nối SIP trunk

### 1. Khai báo tổng đài trên Zalo Developer
- Vào menu "Gọi thoại" của App → nhập IP/Port tổng đài SIP DN vào "Cổng kết nối" (Static IP public).
- Tạo phân luồng cho từng OA: **ID** = `OAID` + 3 chữ số, **Tên** gợi nhớ. Map ID này tới IVR/Group tương ứng trên tổng đài DN.

### 2. Cấu hình SIP trunk giữa SBC/PBX và ZCC

```
Server/IP: <AppID>.zcc.openapi.zaloapp.com
Port: UDP/TCP 5060
Codec: PCMU, PCMA (audio); H264 (video nếu có)
```
Nếu không có DNS: khai báo file hosts trỏ domain trên → IP `49.213.78.92`.

**Gọi ra (OA → user):**
- Caller/From: `<OAID>@<AppID>.zcc.openapi.zaloapp.com`
- Callee/To (qua SĐT): `<+84xxxxxxxxx>@<AppID>.zcc.openapi.zaloapp.com`
- Callee/To (qua UID): `<UID>@<AppID>.zcc.openapi.zaloapp.com`

**Gọi vào (user → OA):**
- Caller/From: `<UID>@<AppID>.zcc.openapi.zaloapp.com`
- Callee/To: `<OAID><mã phân luồng>@<AppID>.zcc.openapi.zaloapp.com` (vd OAID=1234567890, phân luồng 100 → `1234567890100@...`)

Mở firewall cho IP Signal ZCC: `49.213.78.92`, `49.213.78.91`, `49.213.78.90`. Port UDP 5060, TCP 80/443/5060/5061.

### 3. Cấu hình nhánh gọi trên OA Manager
Vào OA Manager → Quản lý → Thiết lập cuộc gọi → ZCC → liên kết với luồng đã tạo ở App → kiểm tra nhánh hiển thị.

## Thực hiện cuộc gọi

- **Call Center → user**: bấm số (UID hoặc SĐT).
  - Gọi bằng SĐT: bắt buộc "Yêu cầu quyền thực hiện cuộc gọi" trước (API `requestconsent`) — user có **24h** phản hồi.
  - Gọi bằng UID: user cần tương tác với OA trong **30 ngày** gần nhất (check qua `user_last_interaction_date`, xem `06-user-management.md`).
  - SĐT dạng `+84xxxxxxxxx` hoặc `0xxxxxxxxx`.
- **User → Call Center**: user mở OA trên Zalo → chọn gọi Audio/Video → chọn nhánh → gọi. Call agent thấy Caller là user đang gọi.

## API

### Gửi yêu cầu cấp quyền gọi — `POST v2.0/oa/call/requestconsent`

```json
{"phone": "84773543888", "call_type": "audio", "reason_code": 101}
```
`call_type`: `audio`|`video`|`audio_and_video`. `reason_code`: `101` Tư vấn sản phẩm/dịch vụ, `103` Xác nhận đơn hàng/cuộc hẹn, `105` Thông báo giao hàng, `106` Thông báo chuyến bay, `107` Cập nhật đơn hàng (lý do khác liên hệ `oa@zalo.me`).

### Kiểm tra người dùng đã cấp quyền — `GET v2.0/oa/call/checkconsent?data={"phone":"..."}`

Response: `{"error": <code>, "message": "...", "expired_time": <ts>}`.

| Mã lỗi | Ý nghĩa |
|---|---|
| 0 | User approved the request |
| 1 | Already allowed to call |
| 2 | Request sent |
| 3 | User rejected the request |
| 4 | User blocked |
| 5 | Vượt số lượng request cho phép, thử lại sau |
| 6 | Insufficient permissions |
| 7 | Cần lý do khi xin quyền (reason_code) |
| 8 | Waiting for user approval |
| 9 | User chưa từng tương tác với OA này |
| 10 | Bad connection |
| 11 | Bad request |
| 12 | Lỗi hệ thống, thử lại sau |
| 13 | Invalid param |
| 14 | Failed |
| 16 | Consent expired |
| 18 | Outside working hours |
| 19 | Not in permitted time range |
| 20 | OA chưa từng gửi yêu cầu consent |
| 21 | OA đã tắt inbound call |

### Tạo link gọi outbound (OA → user) — `POST v3.0/oa/call/outbound`

```json
{"user_id": "4491783511907164918", "agent_id": "5931518706854365424", "call_type": "audio"}
```
`agent_id` optional (`user_id` của tổng đài viên chỉ định). Response: `{"data": {"call_link": "...", "qr_code": "...", "ttl": 172800}}` (ttl tính bằng giây).

### Tạo link gọi inbound (user → OA) — `POST v3.0/oa/call/inbound`

```json
{"branch_id": "231747", "agent_id": "5931518706854365424", "call_type": "audio"}
```
`branch_id`/`agent_id` optional. Response giống outbound.

### Lấy thông tin Agent/Branch — `GET v3.0/oa/call/getmccinfo`

Response: `agents[]` (`agent_id`, `agent_name`, `allocation` — danh sách branch_id đang phụ trách), `branches[]` (`branch_id`, `branch_name`, `status`: `on`|`off`).

## Webhook liên quan
Xem `07-webhooks.md`: `oa_send_consent` (yêu cầu gửi/hết hạn), `user_reply_consent` (user phản hồi), `user_call_oa`/`oa_call_user` (kết thúc cuộc gọi, gồm `call_duration`/`waiting_time`/`talk_time`/`status_code`).
