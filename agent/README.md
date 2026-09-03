# P0 — Insight Agent (chỉ đọc)

Giai đoạn P0 của bản vẽ trong [`docs/kien-truc-he-agent.md`](../docs/kien-truc-he-agent.md).

## Một thay đổi so với bản vẽ, và lý do

Bản vẽ mô tả P0 như một *agent* có vòng lặp tool. Khi bắt tay dựng thì thấy không đúng tầng.
Báo cáo hằng ngày là bài toán đã biết trước cần lấy gì, còn chi phí sai số thì là tiền thật.
Cho model tự chọn dữ liệu ở đây chỉ thêm đường cho nó sai, không thêm giá trị nào.

Nên P0 chạy theo **workflow**, không phải agent:

```
Pancake POS  →  harness lấy số  →  code tính toàn bộ  →  model viết chữ  →  code kiểm lại từng số  →  báo cáo
                                        ↑                                          │
                                        └──── mọi con số phải truy về đây ──────────┘
```

Vòng lặp tool để dành cho P1, khi người vận hành hỏi ngược ("sao doanh thu tụt?") — lúc đó
việc model tự chọn lát cắt dữ liệu mới thật sự đáng.

## Chạy

```bash
npm run agent:test                                   # 9 test, không cần mạng
npm run agent:dry -- --shop=430426051 --until=2026-09-03   # nửa tất định, không tốn API
npm run agent:report -- --shop=430426051 --out=./reports    # chạy đủ, cần ANTHROPIC_API_KEY
```

Tham số: `--shop` (bỏ trống thì chạy mọi shop `active` trong `config.js`), `--until=YYYY-MM-DD`,
`--days=14`, `--source=fixture|rest`, `--out=<thư mục>`, `--dry`.

## Luật: số do code tính, chữ do model viết

`lib/metrics.js` cộng và chia toàn bộ. Model chỉ nhận kết quả đã tính và diễn giải.
Sau khi model viết xong, `verifyNarrative` bóc **mọi** token số trong bài và đối chiếu với
tập giá trị harness đã tính, dung sai 0,5%. Một con số không truy được nguồn là cả bản
bị đóng dấu `CHƯA KIỂM CHỨNG` ngay dòng đầu, và tiến trình thoát mã 1 để lịch chạy tự động
không âm thầm phát số sai.

Đây là chỗ đáng đọc kỹ nhất khi review, và là chỗ có test dày nhất.

## Trạng thái từng phần

| Phần | Trạng thái |
| --- | --- |
| Tính toán + kiểm chứng | Chạy được, có test |
| Kết xuất báo cáo | Chạy được |
| Gọi model | Viết xong theo SDK 0.72.1, **chưa chạy thật lần nào** (chưa có khoá) |
| Nguồn `fixture` | Chạy được, dữ liệu tất định đúng hình dạng phản hồi thật |
| Nguồn `rest` | **Đường dẫn và cách xác thực chưa kiểm chứng** — xem bên dưới |

## Chỗ còn hở

`sources/pancake.js` → `restSource`: phần *đọc phản hồi* đã bám đúng schema thật của
`pos_statistics.list_analytics_sale` (kiểm chứng 2026-09-03 qua MCP). Phần *gửi yêu cầu* —
base URL và tên tham số khoá — thì chưa: trong phiên dựng module này Pancake chỉ tiếp cận
được qua MCP chứ không qua REST, nên chưa có gì để đối chiếu. Cần tài liệu API của Pancake
hoặc một khoá thật để chốt, trước khi đổi `--source=rest`.

TikTok Shop qua apideck hiện **không dùng được**: thiếu cấu hình `APIDECK_APP_ID`. Không sao
với P0 vì đơn từ sàn đã đổ về Pancake (`fee_marketplace`, `platform_commission` có số).

## Ngưỡng bất thường

`config.js` → `THRESHOLDS`. Các con số ở đó (quảng cáo > 20% doanh thu, hoàn > 8%) là chỗ
đặt tạm để có cái mà chạy, không phải chuẩn ngành. Chủ shop cần chỉnh theo từng ngành hàng.
