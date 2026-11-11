'use strict';

/**
 * Danh sách shop mientaymedia đang vận hành trên Pancake POS.
 * Lấy từ pos_shop.list ngày 2026-09-03. `active` bật lên nghĩa là P0 chạy cho shop đó.
 */
const SHOPS = [
  { id: 430426051, name: 'Tổng kho MLM', active: true },
  { id: 1942266492, name: 'MienTay Media', active: true },
  { id: 100995649, name: 'Hậu Tâm Store', active: false },
  { id: 230302295, name: 'Xưởng Jeans Hậu Tâm', active: false },
  { id: 1635950936, name: 'Tiara', active: false },
  { id: 1720114098, name: 'Xưởng Băng Keo Tân Thuận Phát', active: false },
  { id: 1022087002, name: 'THE FRIEND', active: false },
  { id: 101049990, name: 'VINSONFORM', active: false },
];

/**
 * Ngưỡng đánh dấu bất thường. Đây là con số cần chủ shop chỉnh theo ngành hàng,
 * không phải hằng số phổ quát — để ở đây cho dễ sửa, không rải trong code.
 */
const THRESHOLDS = {
  adsRatioPct: 0.2, // quảng cáo vượt 20% doanh thu
  returnRatePct: 0.08, // tỷ lệ hoàn vượt 8%
  netProfitNegative: true, // lỗ sau quảng cáo thì luôn nêu
};

function activeShops() {
  return SHOPS.filter((s) => s.active);
}

function findShop(id) {
  const shop = SHOPS.find((s) => String(s.id) === String(id));
  if (!shop) throw new Error(`Không có shop ${id} trong config.js`);
  return shop;
}

module.exports = { SHOPS, THRESHOLDS, activeShops, findShop };
