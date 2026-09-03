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
| Nguồn `fixture` | Chạy được; hình dạng lấy từ phản hồi thật, con số là tổng hợp |
| Đọc phản hồi Pancake | Đã đối chiếu với phản hồi thật |
| Nguồn `rest` (phần gửi yêu cầu) | **Đường dẫn và cách xác thực chưa kiểm chứng** — xem bên dưới |

## Hai cổng chặn, không phải một

**Cổng 1 — số model viết.** Như mô tả ở trên.

**Cổng 2 — số harness cộng.** `list_analytics_sale` trả kèm `summary`, tức tổng kỳ do
chính server cộng. `reconcile` so tổng harness tự cộng với tổng đó; lệch quá 0,5% thì
lượt chạy hỏng ngay, trước khi model kịp viết một chữ nào.

Cổng 2 sinh ra vì một lỗi có thật. Bản đầu của `sources/pancake.js` viết theo *tài liệu*
schema: đọc `bucket.key` và `bucket.data`. Phản hồi thật lại trả `bucket["Time.day"]` và
`bucket.success` / `bucket.returned` / `bucket.result`. Hậu quả là mọi dòng về 0 — và
**không có gì báo lỗi**, vì fixture khi đó cũng do chính giả định sai đó sinh ra. Test
xanh, báo cáo ra số 0, không ai biết.

Ba thứ rút ra, đã đóng lại thành code chứ không phải ghi chú:

1. `test/pancake.test.js` giữ một mảnh phản hồi **đúng hình dạng thật** làm mỏ neo hồi quy.
2. `reconcile` đối chiếu với một phép cộng độc lập, nên lỗi đọc sai bucket không thể im lặng.
3. Fixture sinh theo hình dạng thật, không theo hình dạng mình tưởng.

Một chi tiết dễ vấp: `summary` của API cộng theo `result` cho **mọi** trường, kể cả số đơn
— mà `result.order_count` là hiệu success trừ returned nên có thể âm. Vì vậy `netOrderCount`
tồn tại riêng để đối chiếu, còn báo cáo vẫn hiển thị đơn chốt và đơn hoàn tách bạch.

## Chỗ còn hở

`sources/pancake.js` → `restSource`: phần *đọc phản hồi* đã đối chiếu với phản hồi thật
(shop 430426051, 2026-08-28 → 08-31, đọc qua MCP ngày 2026-09-03). Phần *gửi yêu cầu* —
base URL và tên tham số khoá — thì chưa: phiên dựng chỉ tiếp cận Pancake qua MCP chứ không
qua REST, nên chưa có gì để đối chiếu. Cần tài liệu API hoặc một khoá thật, trước khi đổi
`--source=rest`.

## Múi giờ: đã đo, không còn đoán

Lần đầu thấy API trả **bốn** bucket cho một yêu cầu ba ngày, giả thuyết là lệch múi giờ.
Ba phép thử trên dữ liệu thật (shop 430426051, 2026-09-03) đã chốt lại:

| Cửa sổ gửi đi (UTC) | Quy ra giờ VN | Bucket nhận về |
| --- | --- | --- |
| 28T00:00 → 30T23:59 | 28 07:00 → **31** 06:59 | 28, 29, 30, **31** |
| 28T**17:00** → 29T**16:59** | **29 00:00 → 29 23:59** | **chỉ 29** |
| 29T00:00 → 29T23:59 | 29 07:00 → 30 06:59 | chỉ 29 |

Phép thử thứ hai bác bỏ giả thuyết "API bỏ qua phần giờ, chỉ đọc phần ngày" — nếu vậy nó
đã phải trả cả 28. Phép thử thứ ba bác bỏ "API quy đổi rồi lấy nguyên ngày VN" — nếu vậy
nó đã phải trả cả 30.

Cách giải thích khớp cả ba: **mốc thời gian được tôn trọng đúng như gửi, ngày được gán nhãn
theo giờ VN, và bucket không có dữ liệu nào rơi vào khoảng thì bị bỏ.**

Hệ quả: dựng mốc theo ngày UTC là lệch 7 tiếng, kỳ báo cáo dính một ngày cụt ở biên và
một job chạy buổi sáng sẽ âm thầm cộng thừa hoặc thiếu. `periods()` vì thế cắt theo ngày
lịch Việt Nam rồi mới quy về UTC để gửi; `TZ_OFFSET_HOURS` là tham số, đổi được nếu Pancake
đổi cách chia ngày. `periods.test.js` neo thẳng vào cửa sổ của phép thử thứ hai.

Chỗ chưa chắc: cách giải thích trên khớp cả ba quan sát nhưng chưa loại trừ hết mọi khả
năng khác. Nếu có tài liệu chính thức của Pancake về múi giờ thì nên đối chiếu lại.

TikTok Shop qua apideck hiện **không dùng được**: thiếu cấu hình `APIDECK_APP_ID`. Không sao
với P0 vì đơn từ sàn đã đổ về Pancake (`fee_marketplace`, `platform_commission` có số).

## Ngưỡng bất thường

`config.js` → `THRESHOLDS`. Các con số ở đó (quảng cáo > 20% doanh thu, hoàn > 8%) là chỗ
đặt tạm để có cái mà chạy, không phải chuẩn ngành. Chủ shop cần chỉnh theo từng ngành hàng.
