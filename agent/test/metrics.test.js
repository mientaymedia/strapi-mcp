'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  totals, derive, buildFigures, extractNumbers, verifyNarrative,
} = require('../lib/metrics');
const { periods } = require('../run');

const ROWS = [
  { date: '2026-09-01', revenue: 100000, capital: 60000, profit: 36000, adsAmount: 12000, feeMarketplace: 4000, shippingFee: 1000, orderCount: 10, returnedOrderCount: 1 },
  { date: '2026-09-02', revenue: 200000, capital: 120000, profit: 72000, adsAmount: 18000, feeMarketplace: 8000, shippingFee: 2000, orderCount: 20, returnedOrderCount: 1 },
];

test('totals chỉ cộng, không suy diễn', () => {
  const sum = totals(ROWS);
  assert.strictEqual(sum.revenue, 300000);
  assert.strictEqual(sum.profit, 108000);
  assert.strictEqual(sum.orderCount, 30);
});

test('derive trừ quảng cáo ra lợi nhuận thực', () => {
  const d = derive(totals(ROWS));
  assert.strictEqual(d.netProfit, 108000 - 30000);
  assert.ok(Math.abs(d.marginPct - 0.36) < 1e-9);
});

test('kỳ rỗng trả null chứ không trả 0 giả', () => {
  const d = derive(totals([]));
  assert.strictEqual(d.marginPct, null);
  assert.strictEqual(d.returnRatePct, null);
  assert.strictEqual(d.roas, null);
});

test('extractNumbers đọc đúng quy ước vi-VN', () => {
  const found = extractNumbers('Doanh thu 1.234.567 đ, biên 36,5%, 12 đơn.');
  assert.deepStrictEqual(found.map((f) => f.value), [1234567, 36.5, 12]);
});

const FIGURES = buildFigures({
  rows: ROWS, previousRows: null,
  shop: { id: 1, name: 'Test' },
  since: '2026-09-01T00:00:00Z', until: '2026-09-02T23:59:59Z',
});

test('diễn giải dùng đúng số của harness thì được duyệt', () => {
  const narrative = 'Doanh thu 300.000 đ, lợi nhuận sau quảng cáo 78.000 đ trên 30 đơn.';
  const result = verifyNarrative(narrative, FIGURES);
  assert.strictEqual(result.status, 'verified');
  assert.deepStrictEqual(result.untraceable, []);
});

test('CỔNG CHẶN: một con số bịa ra là cả bản bị đánh dấu chưa kiểm chứng', () => {
  const narrative = 'Doanh thu 300.000 đ, và chúng tôi ước tính quý sau đạt 987.654 đ.';
  const result = verifyNarrative(narrative, FIGURES);
  assert.strictEqual(result.status, 'unverified');
  assert.ok(result.untraceable.includes('987.654'));
});

test('lệch trong 0,5% thì chấp nhận, quá thì không', () => {
  assert.strictEqual(verifyNarrative('299.000 đ', FIGURES).status, 'verified');   // lệch 0,33%
  assert.strictEqual(verifyNarrative('280.000 đ', FIGURES).status, 'unverified'); // lệch 6,7%
});

test('hai kỳ dài bằng nhau và không chồng lấn', () => {
  const p = periods('2026-09-03', 14);
  assert.strictEqual(p.current.since.slice(0, 10), '2026-08-21');
  assert.strictEqual(p.previous.until.slice(0, 10), '2026-08-20');
  assert.strictEqual(p.previous.since.slice(0, 10), '2026-08-07');
});

// Phần ánh xạ bucket của Pancake được phủ ở pancake.test.js, dựa trên hình dạng
// phản hồi thật — không dựng lại ở đây theo giả định.
