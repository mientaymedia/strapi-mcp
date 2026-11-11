# Zalo OA Extension (ZOA)

**Khác với Zalo Mini App**: Mini App chạy trong app Zalo cho **người dùng cuối**; ZOA Extension chạy **trong giao diện OA Manager** cho **OA Admin / nhân viên OA**. Hai sản phẩm dùng CLI, SDK, và quy trình deploy hoàn toàn khác nhau — đừng nhầm lẫn khi được yêu cầu "làm Mini App" vs "làm Extension".

## Extension là gì?

Ứng dụng giúp OA giải quyết tác vụ trực quan ngay trên giao diện. 2 nhóm người dùng:
- **OA Admin**: cài đặt/quản lý/dùng Extension từ OA Manager (dashboard, chat, thiết lập profile, trang cấu hình tiện ích).
- **Zalo User**: tương tác với OA qua OA Profile và các điểm chạm khác.

**Ưu điểm so với Zalo App (chỉ có API)**: Extension hiển thị **giao diện trực tiếp** qua các **zone** tùy biến, và xuất hiện trên **Extension Hub** để OA Admin dễ khám phá/cài đặt.

### Workflow tổng quát

1. **Cài đặt** (bước 1-12): OA Admin tìm & cài từ Extension Hub → thanh toán → cấp quyền → Extension nhận `authorization code` OAuth 2.0 → đổi lấy access token (giống luồng App thường, xem `01-auth.md`).
2. **Khởi tạo UI** (13-16): User/Admin vào OA Manager/OA Profile → Extension UI được load → Extension xác thực request qua HMAC → trả nội dung.
3. **Tương tác UI** (17-19): User tương tác qua iframe → Extension xử lý → cập nhật nội dung động.
4. **Mở rộng** (20-23): Extension lắng nghe webhook events, dùng `zoaSdk` hoặc gọi Open API để lấy thêm dữ liệu / gửi tin, cập nhật iframe.

## Danh sách Zone

Zone = khu vực cụ thể trong OA Manager nơi Extension tích hợp. 2 cơ chế hiển thị:
- **Block**: hiện đồng thời với giao diện mặc định của trang.
- **Action**: entrypoint dạng mục dropdown, click vào mở nội dung Extension trong **modal**.

Một Extension có thể tích hợp **nhiều zone**. Trong giao diện chat, ví dụ có thể dùng cả `admin-chat-message-toolbar-action` (mở modal) lẫn `admin-chat-message-profile-block` (hiện sẵn).

| Zone | Vị trí | Cơ chế | `roles` áp dụng | Kích thước | Dữ liệu `getSessionInfo` |
|---|---|---|---|---|---|
| `admin-dashboard-primary-area-block` | Trang chủ Dashboard (`oa.zalo.me/manage/dashboard`) | Block | Có | Cao tối đa **500px**, rộng tự động (đồng nhất mục "Thống kê tương tác") | `admin_id`, `oaid` |
| `admin-chat-message-profile-block` | Trang chat (`oa.zalo.me/chatv2`), panel bên phải | Block | Có | Cao tối đa **300px**, rộng đồng nhất mục "Quản lý nhãn" | `oaid`, `admin_id`, `user_id` (người đang chat) |
| `admin-chat-message-toolbar-action` | Thanh công cụ trang chat | Action → mở modal | Có | Tùy số lượng/kích thước action | `oaid`, `admin_id`, `user_id` |
| `user-profile-config-block` | Trang OA Profile công khai (`zalo.me/oa_id`) — **hiển thị cho Zalo User** | Block | Không (dành cho end-user) | Cao tối đa **800px**, rộng tự động theo màn hình | `oa_id`, `user_id`, `user_is_follower`, `user_last_interaction_timestamp` |
| `admin-profile-config-action` | Trang Thiết lập Trang thông tin OA (`oa.zalo.me/manage/profile-setting`) | Action | Có (`roles: ["MANAGER"]` khuyến nghị) | — | `admin_id`, `oaid` |
| `admin-extension-config-block` | Trang "Thiết lập sử dụng" của Extension đã cài (`oa.zalo.me/manage/extension/ext_id/config`) | Block | Mặc định giới hạn Quản trị viên + Soạn nội dung | **Không giới hạn** chiều cao, rộng tự động | `admin_id`, `oaid` |

Lưu ý riêng từng zone:
- `user-profile-config-block` **chỉ hiển thị** khi OA đã chọn & thiết lập Extension tại zone `admin-profile-config-action`. Dùng cho: banner khuyến mãi, nhận voucher, mini-game — hướng tới khách hàng cuối, không phải seller/admin.
- `admin-profile-config-action`: OA chỉ chọn được **1 Extension** hiển thị trên OA Profile tại 1 thời điểm.
- `admin-extension-config-block`: header trang có logo/tên Extension + nút "Hỗ trợ" (đang ẩn trong giai đoạn POC).

## Cấu hình `app-config.json`

```json
{
  "app": {"title": "ProjectName"},
  "debug": false,
  "zones": {
    "admin-dashboard-primary-area-block": {"enable": true},
    "admin-profile-config-action": {"enable": true},
    "user-profile-config-block": {"enable": true},
    "admin-chat-message-profile-block": {"enable": true, "roles": ["MANAGER", "MODERATOR"]},
    "admin-chat-message-toolbar-action": {"enable": true, "roles": ["MANAGER", "MODERATOR"]}
  },
  "listCSS": [], "listSyncJS": [], "listAsyncJS": []
}
```

- Chỉ zone được khai báo **và** `enable: true` mới hiển thị.
- `zones.<name>.roles` (mảng, chỉ áp dụng zone `admin-*`): để trống = hiển thị mọi role admin.

### Role admin OA hợp lệ

`CUSTOMER_SERVICE` (chăm sóc khách hàng), `ADVERTISER` (nhân viên quảng cáo), `INSIGHT_ANALYST` (nhà phân tích), `AGENCY` (quản lý gói & liên kết), `MANAGER` (quản trị viên), `MODERATOR` (quản lý nội dung).

⚠️ Một số project mẫu cũ (bundle trong npm `zoa-cli`) dùng `"roles": ["admin", "agent"]` — **đây là giá trị sai/lỗi thời**, không khớp docs hiện hành. Luôn dùng 6 role viết HOA ở trên.

## Routing

Mỗi zone tương ứng 1 route `/zone/<zone-name>`, router có `basename: /extension/<APP_ID>`:

```jsx
const routes = [
  { path: "/zone/admin-dashboard-primary-area-block", element: <FeeCalculator /> },
  { path: "/zone/admin-chat-message-profile-block", element: <FeeCalculatorMini /> },
  { path: "/zone/admin-extension-config-block", element: <Settings /> },
];
const router = createBrowserRouter(routes, { basename: `/extension/${process.env.APP_ID}` });
```

## `zoaSdk` — nạp qua `<script>`, không phải npm package

```html
<script src="https://dev-stc-zoachatclient.zdn.vn/zoa-sdk-dev/zoa-sdk.js"></script>
```
Truy cập qua global `window.zoaSdk`. Các hàm chính:

| Hàm | Mô tả |
|---|---|
| `zoaSdk.openModal({title, path, height, width, onClose})` | Mở modal — dùng cho zone `*-action` hoặc chi tiết từ 1 block |
| `zoaSdk.closeModal()` | Đóng modal |
| `zoaSdk.getSessionInfo((result, error) => {})` | Lấy `data` (tùy zone, xem bảng zone) + `hmac` để xác thực. **Không gọi được từ local** — chỉ hoạt động khi chạy thật trong OA Manager/OA test |
| `zoaSdk.getViewPort((result, error) => {})` | Lấy `{width, height, offsetX, offsetY}` của khung chứa iframe |
| `zoaSdk.openPermission()` | Mở pop-up xin quyền OA — dùng tiết chế, tránh làm phiền user |

```jsx
window?.zoaSdk?.openModal({
  title: item.name,
  path: `/extension/${process.env.APP_ID}/products/${item.id}`,
  height: 800, width: 800,
});
```

### Xác thực dữ liệu `getSessionInfo` (làm ở BACKEND)

```json
{"data": {"oa_id": "123", "admin_id": "213", "user_id": "213213", "timestamp": 1726111886460}, "hmac": "53d2db..."}
```
```
hmac = sha256(extensionId + jsonData_sorted + secretKey)
```
`jsonData` phải **sort field theo tên tăng dần** trước khi hash. So khớp `hmac` tính được với `hmac` server trả — khớp thì dữ liệu chưa bị chỉnh sửa. `secretKey` **chỉ dùng backend**, không đưa vào code frontend Extension.

⚠️ Công thức này **khác** công thức chữ ký webhook (`sha256(appId + data + timeStamp + OAsecretKey)`, có thêm `timeStamp`) — xem `07-webhooks.md`.

## zoa-cli — dựng & deploy dự án

```bash
npm i -g zoa-cli
zoa --version
```

| Lệnh | Mô tả |
|---|---|
| `zoa init` | Nhập Zalo App ID → **Login via QR code with Zalo App** (cần quét bằng điện thoại, không tự động hóa được) → chọn "Create a new ZOA Extension project" |
| `zoa login` | Đăng nhập lấy `ZOA_TOKEN` |
| `zoa build` | Build bằng Vite, output vào `www/` (build thật gọi `vite.build()` với `root` = thư mục gốc project, **ghi đè** `root: "./src"` khai báo trong `vite.config.js`) |
| `zoa deploy` | Đẩy code lên hệ thống quản lý phiên bản |

Env đọc từ file `.env` (đúng tên, **không phải** `.env.local`) ở root project: `APP_ID=<app_id>`, `ZOA_TOKEN` (tự ghi bởi `zoa login`, không tự điền tay).

### Cấu trúc project mẫu (từ `github.com/zaloplatform/zoa-extension/tree/master/examples/simple-sample`)

```
project/
  app-config.json
  index.html              # entry, load zoa-sdk.js + script src="src/index.ts"
  vite.config.js           # root:"./src" (bị build script override), EnvironmentPlugin({APP_ID})
  package.json             # deps: react, react-dom, react-router-dom, sass, tailwind, express (server.js optional self-host)
  server.js                 # optional: static file server cho thư mục www/ đã build (SPA fallback)
  src/
    index.ts                  # import css, mount React root
    containers/app.tsx          # định nghĩa routes /zone/{zone-name}, basename /extension/{appId}
    views/*.tsx                  # nội dung từng zone
```

`index.html` (mẫu):
```html
<link rel="modulepreload" crossorigin href="https://dev-stc-zoachatclient.zdn.vn/zoa-sdk-dev/zoa-sdk.js">
<script type="module" src="src/index.ts"></script>
```

## Kiểm thử trên OA test (sandbox)

Sau `zoa deploy`:
1. Trang quản lý phiên bản: `https://developers.zalo.me/app/<APP_ID>/extension/versions`
2. Chọn OA test: `https://developers.zalo.me/app/<APP_ID>/extension/sandbox`
3. Mở giao diện OA đã chọn → kiểm thử các zone.

⚠️ Giai đoạn POC: chỉ Zalo `APP_ID` được cấp quyền mới truy cập được trang quản lý phiên bản.
