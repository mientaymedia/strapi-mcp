# Bảng mã lỗi Official Account API

Áp dụng cho hầu hết endpoint `openapi.zalo.me/*`. Trường `error` trong response — `0` là thành công.

| Mã | Thông báo | Mô tả | Hướng xử lý |
|---|---|---|---|
| 0 | Success | Request thành công | — |
| -32 | Your application reached limit call api / Your OA reached limit call api | Vượt rate limit request/phút (app hoặc OA) | Điều chỉnh tốc độ gọi, xem `01-auth.md` |
| -100 | attachment_id was expired | `attachment_id` hết hạn | Upload lại attachment lấy id mới |
| -200 | Send message failed | Gửi tin thất bại | — |
| -201 | `<data_field>` is invalid! | Tham số không hợp lệ | Kiểm tra lại tham số request |
| -204 | Offical Account is disable | OA đã bị xóa | Kiểm tra trạng thái OA |
| -205 | Offical Account is not exist | OA không tồn tại | Kiểm tra `oa_id` |
| -209 | Not supported this api | App chưa được kích hoạt | Quản lý ứng dụng → Cài đặt → bật "Đang hoạt động" |
| -210 | Parameter exceeds allowable limit | Tham số vượt giới hạn | Kiểm tra giới hạn tham số |
| -211 | Out of quota | Vượt quota tính năng | Kiểm soát quota cho các lần gọi tiếp theo |
| -212 | App has not registed this api | OA chưa đăng ký API này | Đăng ký sử dụng API → Official Account API |
| -213 | User has not followed OA | User chưa quan tâm OA | Kiểm tra điều kiện tương tác của loại tin |
| -214 | Article is being processed | Bài viết đang xử lý | Chờ và gọi lại sau |
| -216 | Access token is invalid | Access token không hợp lệ | Kiểm tra/lấy access token mới |
| -217 | User has blocked invitation from OA | User chặn tin mời quan tâm | — |
| -218 | Out of quota receive | Vượt giới hạn nhận của user này | Xem giới hạn nhận của user từ OA |
| -219 | App is removed or disabled | App bị gỡ/vô hiệu hóa | Kiểm tra quyền admin & trạng thái App |
| -220 | access_token is expired or removed | Access token hết hạn | Lấy access token mới |
| -221 | The OA needs to be verified to use this feature | OA chưa xác thực | Nộp hồ sơ xác thực OA |
| -223 | Official Account has not authorized this API / Your OA has reach the limit quota create article | OA chưa cấp quyền API / vượt hạn mức xuất bản nội dung | Kiểm tra cấp quyền OA cho App / hạn mức xuất bản |
| -224 | The OA needs to upgrade OA Tier Package to use this feature | OA chưa mua gói phù hợp | Kiểm tra & nâng cấp gói OA |
| -227 | User is banned or has been inactive for more than 45 days | Tài khoản user bị khóa/không online >45 ngày | Tham khảo quy định vô hiệu hóa tài khoản Zalo |
| -230 | User has not interacted with the OA in the past 7 days | User không tương tác 7 ngày qua | Tham khảo chính sách tương tác OA |
| -232 | User has not interacted with the OA, or the last interaction has expired | Chưa tương tác hoặc tương tác đã hết hạn | Tham khảo chính sách tương tác OA |
| -233 | message type is invalid or not support | Loại tin không hỗ trợ | Kiểm tra loại tin trong request |
| -234 | This message cannot be sent at night (10:00PM - 6:00AM) | Tin loại này không gửi được ban đêm | Tham khảo khung giờ gửi tin |
| -235 | This API does not support this type of OA | API không hỗ trợ loại OA này | Kiểm tra loại hình đăng ký OA |
| -237 | The group is disabled | Nhóm chat GMF hết hạn | Gia hạn dịch vụ nhóm |
| -238 | asset_id is already used / asset_id is disabled | asset_id đã dùng hoặc không khả dụng | Chọn asset_id khác |
| -240 | MessageV2 API has been shut down, please switch to MessageV3 | API gửi tin V2 ngừng hoạt động | Chuyển sang API V3 |
| -241 | asset_id is already used | asset_id miễn phí (gói dịch vụ) đã dùng | Chọn asset_id phù hợp |
| -242 | Invalid appsecret_proof provided in the API argument | `appsecret_proof` không hợp lệ | Xem hướng dẫn `appsecret_proof` |
| -244 | User has restricted this message type from your OA | User đã hạn chế nhận loại tin này | — |
| -248 | Violates our platform standards | Vi phạm tiêu chuẩn nền tảng | Tuân thủ `go.zalo.me/oa-policy` |
| -249 | Template does not support send via UID | Template không hỗ trợ gửi qua UID (template cũ trước 10/12/2025, OTP, có component Response, hoặc Journey) | Dùng template hỗ trợ UID: tùy chỉnh, đánh giá dịch vụ, yêu cầu thanh toán, Voucher — hoặc tạo mới/clone template |
| -320 | Your app needs to connect with Zalo Cloud Account to use paid features | App chưa liên kết ZCA | Liên kết ZCA |
| -321 | Zalo Cloud Account associated with this app is out of money or unable to be charged | ZCA hết tiền/không thể trả phí | Kiểm tra số dư & nạp tiền ZCA |
| -403 | OA is not in group | Nhóm chat không thuộc sở hữu OA | Kiểm tra danh sách nhóm của OA |
| -1340 | Cannot find this form | Không tìm thấy Form | — |
| -1341 | Official Account has no access to this form | OA không có quyền truy cập form | — |

## Mã lỗi riêng — `checkconsent` (xin quyền gọi thoại)

Xem bảng đầy đủ tại `04-calling-zcc.md` (mã `0`–`21`, ví dụ `0`=đã đồng ý, `3`=từ chối, `9`=chưa từng tương tác, `16`=consent hết hạn).
