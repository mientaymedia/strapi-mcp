'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { normalizeRow, parseResponse } = require('../sources/pancake');
const { reconcile, totals } = require('../lib/metrics');

/**
 * Mảnh phản hồi giữ NGUYÊN HÌNH DẠNG THẬT của list_analytics_sale
 * (con số đã thay để không đưa doanh thu khách hàng vào repo).
 *
 * Đây là test hồi quy cho một lỗi có thật: bản đầu đọc `bucket.key` và `bucket.data`,
 * trong khi API trả `bucket["Time.day"]` và `bucket.success/returned/result`.
 * Hậu quả là mọi dòng về 0 mà không có gì báo lỗi.
 */
const REAL_SHAPE = {
  success: true,
  pagination: null,
  data: [
    {
      'Time.day': '2026-08-28',
      result: { revenue: 3800000, capital: 3200000, profit: 500000, ads_amount: 0, fee_marketplace: 41000, shipping_fee: 25000, order_count: 7, total_order_count: 5 },
      returned: null,
      success: { revenue: 3800000, capital: 3200000, profit: 500000, ads_amount: 0, fee_marketplace: 41000, shipping_fee: 25000, order_count: 7, total_order_count: 5 },
    },
    {
      'Time.day': '2026-08-29',
      result: { revenue: 650000, capital: 720000, profit: -87000, ads_amount: 0, fee_marketplace: -3800, shipping_fee: 0, order_count: -1, total_order_count: 2 },
      returned: { revenue: 930000, capital: 610000, profit: 319000, ads_amount: 0, fee_marketplace: 3800, shipping_fee: 0, order_count: 2, is_returned: true },
      success: { revenue: 1580000, capital: 1330000, profit: 232000, ads_amount: 0, fee_marketplace: 0, shipping_fee: 0, order_count: 1, total_order_count: 2 },
    },
  ],
  summary: { revenue: 4450000, capital: 3920000, profit: 413000, ads_amount: 0, fee_marketplace: 37200, shipping_fee: 25000, order_count: 6 },
};

test('HỒI QUY: phản hồi thật không được cho ra dòng toàn số 0', () => {
  const { rows } = parseResponse(REAL_SHAPE);
  assert.strictEqual(rows.length, 2);
  for (const row of rows) {
    assert.ok(row.date, 'thiếu ngày — đang đọc sai khoá ngày');
  }
  assert.strictEqual(rows[0].revenue, 3800000);
  assert.notStrictEqual(rows[0].revenue, 0);
});

test('tiền lấy từ result (đã trừ hoàn), không lấy từ success', () => {
  const { rows } = parseResponse(REAL_SHAPE);
  assert.strictEqual(rows[1].revenue, 650000);   // result, không phải success 1.580.000
  assert.strictEqual(rows[1].profit, -87000);    // lỗ ròng sau khi trừ hoàn
});

test('số đơn lấy từ success, số hoàn lấy từ returned — không lấy result vì nó là hiệu', () => {
  const { rows } = parseResponse(REAL_SHAPE);
  assert.strictEqual(rows[1].orderCount, 1);
  assert.strictEqual(rows[1].returnedOrderCount, 2);
  assert.notStrictEqual(rows[1].orderCount, -1); // result.order_count âm, không dùng được
});

test('returned bằng null thì đơn hoàn là 0, không phải NaN', () => {
  const row = normalizeRow(REAL_SHAPE.data[0]);
  assert.strictEqual(row.returnedOrderCount, 0);
  assert.ok(Number.isFinite(row.returnedOrderCount));
});

test('đối chiếu khớp khi tầng nguồn đọc đúng bucket', () => {
  const { rows, apiSummary } = parseResponse(REAL_SHAPE);
  assert.strictEqual(reconcile(totals(rows), apiSummary).status, 'ok');
});

test('CỔNG CHẶN 2: đọc sai bucket thì đối chiếu bắt được ngay', () => {
  // Mô phỏng đúng con bug cũ: mọi dòng về 0.
  const broken = REAL_SHAPE.data.map((b) => ({ date: b['Time.day'], revenue: 0, capital: 0, profit: 0, adsAmount: 0, feeMarketplace: 0, shippingFee: 0, orderCount: 0, returnedOrderCount: 0 }));
  const result = reconcile(totals(broken), parseResponse(REAL_SHAPE).apiSummary);
  assert.strictEqual(result.status, 'mismatch');
  assert.ok(result.mismatches.some((m) => m.field === 'revenue'));
});

test('không có summary thì bỏ qua đối chiếu chứ không báo khớp giả', () => {
  const { rows } = parseResponse(REAL_SHAPE);
  assert.strictEqual(reconcile(totals(rows), null).status, 'skipped');
});
