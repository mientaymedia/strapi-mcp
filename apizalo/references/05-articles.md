# Article API (Quản lý Nội dung)

Yêu cầu TLS 1.2+. Hỗ trợ tạo/xuất bản/cập nhật/quản lý bài viết và video cho (nhiều) OA. Có thể kết hợp với Broadcast (`02-messaging.md` mục 5) để đẩy nội dung tới người quan tâm, hoặc chia sẻ ra kênh khác để tăng tiếp cận.

Bài viết được tạo **bất đồng bộ**: gọi API tạo → nhận `token` → gọi API `verify` để lấy `id` bài viết thật.

## Tạo bài viết dạng thường (`type: normal`) — `POST v2.0/article/create`

```json
{
  "type": "normal",
  "title": "News",
  "author": "News",
  "cover": {"cover_type": "photo", "photo_url": "url", "status": "show"},
  "description": "This is news",
  "body": [
    {"type": "text", "content": "This is news"},
    {"type": "image", "url": "url_photo", "caption": "không bắt buộc"},
    {"type": "video", "url": "url_video", "thumb": "url_anh"},
    {"type": "product", "id": "<product_id>"}
  ],
  "status": "show",
  "comment": "show"
}
```
- `title` ≤150 ký tự, `author` ≤50 ký tự, `description` ≤300 ký tự.
- `cover.cover_type`: `photo` (`photo_url`) hoặc `video` (`cover_view`: `horizontal`|`vertical`|`square`, `video_id` từ upload). `status` mỗi cover: `show`|`hide`.
- `body[]`: mỗi phần tử 1 đoạn, `type`: `text`|`image`|`video` (`url` hoặc `video_id`)|`product`.
- `status`: `show` (hiện ngay) | `hide` (mặc định — ẩn để duyệt trước).
- `comment`: `show` (mặc định) | `hide`.
- Ảnh dùng cho Article API ≤1MB.

## Tạo bài viết dạng gắn video (`type: video`) — `POST v2.0/article/create`

```json
{"type": "video", "title": "News", "description": "This is news", "video_id": "7f8c46bf7bfa94cbeb", "avatar": "url_image", "comment": "show"}
```

## Upload video cho bài viết

Hỗ trợ **avi, mp4**, tối đa **50MB**.

### 1. Upload & lấy token — `POST v2.0/article/upload_video/preparevideo` (multipart, field `file`)
Response: `{"data": {"token": "..."}}`.

### 2. Kiểm tra trạng thái — `GET v2.0/article/upload_video/verify?token=...`
```json
{"data": {"status_message": "Video is being converted", "video_name": "...", "video_size": ..., "convert_percent": 0, "video_id": "...", "status": 3}}
```

### Mã trạng thái video

| Mã | Ý nghĩa |
|---|---|
| 0 | Không xác định |
| 1 | Xử lý thành công, có thể dùng |
| 2 | Đã bị khóa |
| 3 | Đang xử lý |
| 4 | Xử lý thất bại |
| 5 | Đã bị xóa |

## Kiểm tra kết quả tạo bài viết — `POST v2.0/article/verify`

```json
{"token": "<token trả về từ create/update>"}
```
Response: `{"data": {"id": "<article_id thật>"}}`.

## Lấy chi tiết bài viết — `GET v2.0/article/getdetail?id=<ARTICLE_ID>`

Response `type: normal` trả đầy đủ `title`/`cover`/`description`/`status`/`body`/`comment`/`cite`. Response `type: video` trả `status_message`/`video_name`/`convert_percent`/`video_id`/`status` (giống bảng mã trạng thái video ở trên).

## Lấy danh sách bài viết — `GET v2.0/article/getslice?offset=&limit=&type=normal|video`

Response: `{"data": {"medias": [{"id","type","title","status","total_view","total_share","create_date","update_date","thumb","link_view"}], "total": N}}`.

## Xóa bài viết — `POST v2.0/article/remove`
```json
{"id": "<article_id>"}
```

## Cập nhật bài viết — `POST v2.0/article/update`
Body giống cấu trúc tạo (normal hoặc video) + `id`. Response trả `token` mới → gọi lại `verify` để xác nhận.

## Chỉnh sửa nội dung dạng video — cũng dùng `POST v2.0/article/update`
```json
{"id": "...", "title": "News", "description": "...", "status": "show", "video_id": "...", "avatar": "...", "comment": "show"}
```
