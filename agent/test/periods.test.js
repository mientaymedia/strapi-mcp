'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { periods } = require('../run');

/**
 * Kỳ báo cáo phải cắt theo ngày lịch Việt Nam, không theo ngày UTC.
 * Mỏ neo là ba phép thử chạy trên API thật ngày 2026-09-03 (xem agent/README.md).
 */

test('một ngày VN dựng đúng cửa sổ đã kiểm chứng trên API thật', () => {
  const p = periods('2026-08-29', 1);
  // Đây chính là cửa sổ đã gửi đi và nhận về đúng một bucket 2026-08-29.
  assert.strictEqual(p.current.since, '2026-08-28T17:00:00.000Z');
  assert.strictEqual(p.current.until, '2026-08-29T16:59:59.000Z');
});

test('cửa sổ dài đúng 24 giờ trừ một giây, không hụt không thừa', () => {
  const p = periods('2026-08-29', 1);
  const span = Date.parse(p.current.until) - Date.parse(p.current.since);
  assert.strictEqual(span, 86400000 - 1000);
});

test('nhãn ngày VN tách khỏi mốc UTC — cắt chuỗi mốc UTC là lấy nhầm ngày', () => {
  const p = periods('2026-08-29', 1);
  assert.strictEqual(p.current.sinceDate, '2026-08-29');
  assert.notStrictEqual(p.current.since.slice(0, 10), p.current.sinceDate);
});

test('hai kỳ dài bằng nhau và liền kề, không chồng lấn không hở', () => {
  const p = periods('2026-09-03', 14);
  assert.strictEqual(p.current.sinceDate, '2026-08-21');
  assert.strictEqual(p.current.untilDate, '2026-09-03');
  assert.strictEqual(p.previous.untilDate, '2026-08-20');
  assert.strictEqual(p.previous.sinceDate, '2026-08-07');
  // Kỳ trước kết thúc đúng 1 giây trước khi kỳ này bắt đầu.
  assert.strictEqual(Date.parse(p.current.since) - Date.parse(p.previous.until), 1000);
});

test('bắc qua ranh giới tháng vẫn đúng', () => {
  const p = periods('2026-09-02', 7);
  assert.strictEqual(p.current.sinceDate, '2026-08-27');
  assert.strictEqual(p.previous.untilDate, '2026-08-26');
});

test('tham số hỏng thì dừng ngay, không âm thầm cho ra kỳ vô nghĩa', () => {
  assert.throws(() => periods('không-phải-ngày', 7), /Ngày không hợp lệ/);
  assert.throws(() => periods('2026-09-03', 0), /số nguyên dương/);
  assert.throws(() => periods('2026-09-03', -3), /số nguyên dương/);
});

test('độ lệch múi giờ là tham số, đổi được nếu Pancake đổi cách chia ngày', () => {
  const p = periods('2026-08-29', 1, 0); // giả định UTC
  assert.strictEqual(p.current.since, '2026-08-29T00:00:00.000Z');
});
