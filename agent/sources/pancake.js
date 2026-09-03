'use strict';

/**
 * Tầng nguồn Pancake POS — CHỈ ĐỌC.
 *
 * Ánh xạ dưới đây lấy từ MỘT PHẢN HỒI THẬT của `pos_statistics.list_analytics_sale`
 * (shop 430426051, 2026-08-28 → 08-31, đọc ngày 2026-09-03), không phải từ tài liệu.
 * Bản trước đọc theo tài liệu và sai im lặng — trả toàn số 0 — nên đừng sửa mấy dòng
 * này theo trí nhớ; gọi lại API và nhìn phản hồi.
 *
 * Hình dạng thật của một bucket:
 *   {
 *     "Time.day": "2026-08-29",          // khoá ngày mang tên chiều đã split_by
 *     "success":  { revenue, capital, profit, order_count, ... },   // đơn chốt
 *     "returned": { ... } | null,                                    // đơn hoàn, null khi không có
 *     "result":   { ... }                                            // = success - returned
 *   }
 * Kèm theo là `summary` ở cấp ngoài — tổng kỳ do chính API cộng.
 */

const SELECT_FIELDS = [
  'revenue',
  'capital',
  'profit',
  'ads_amount',
  'fee_marketplace',
  'shipping_fee',
  'order_count',
];

const SPLIT_BY = ['Time.day'];

/** Khoá ngày mang tên chiều, không phải "key". */
const DAY_KEY = 'Time.day';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Chọn bucket nào cho chỉ số nào:
 *   - tiền (doanh thu, giá vốn, lợi nhuận, phí): lấy `result`, tức đã trừ hoàn.
 *   - đơn chốt: lấy `success.order_count`.
 *   - đơn hoàn: lấy `returned.order_count`, không có thì 0.
 * Lấy `result.order_count` làm số đơn là sai — nó là hiệu, có thể âm.
 */
function normalizeBucket(source) {
  const result = source.result || {};
  const success = source.success || {};
  const returned = source.returned || {};
  return {
    revenue: num(result.revenue),
    capital: num(result.capital),
    profit: num(result.profit),
    adsAmount: num(result.ads_amount),
    feeMarketplace: num(result.fee_marketplace),
    shippingFee: num(result.shipping_fee),
    orderCount: num(success.order_count),
    returnedOrderCount: num(returned.order_count),
    // `summary` của API cộng theo `result` cho MỌI trường, kể cả số đơn — nên muốn
    // đối chiếu được thì phải giữ số đơn ròng, cùng định nghĩa với nó.
    netOrderCount: num(result.order_count),
  };
}

function normalizeRow(bucket) {
  return { date: bucket[DAY_KEY], ...normalizeBucket(bucket) };
}

/** Tổng kỳ do API tự cộng — dùng để đối chiếu với tổng harness tự cộng. */
function normalizeSummary(summary) {
  if (!summary) return null;
  // `summary` phẳng, không tách bucket, nên nó là con số ròng của cả kỳ.
  return {
    revenue: num(summary.revenue),
    capital: num(summary.capital),
    profit: num(summary.profit),
    adsAmount: num(summary.ads_amount),
    feeMarketplace: num(summary.fee_marketplace),
    shippingFee: num(summary.shipping_fee),
    netOrderCount: num(summary.order_count),
  };
}

/** Bóc một phản hồi thô thành thứ tầng tính toán dùng được. */
function parseResponse(body) {
  if (body && body.success === false) {
    throw new Error(`Pancake báo lỗi: ${body.message || 'không rõ'}`);
  }
  const buckets = (body && body.data) || [];
  return {
    rows: buckets.map(normalizeRow).filter((r) => r.date),
    apiSummary: normalizeSummary(body && body.summary),
  };
}

/** Adapter đọc từ file — để phát triển và chạy test mà không cần thật. */
function fixtureSource(fixturePath) {
  const payload = require(fixturePath);
  return {
    name: 'fixture',
    async fetchPeriod({ shopId, since, until }) {
      const all = payload[String(shopId)];
      if (!all) return { rows: [], apiSummary: null };
      const from = since.slice(0, 10);
      const to = until.slice(0, 10);
      const buckets = all.data.filter((b) => b[DAY_KEY] >= from && b[DAY_KEY] <= to);
      // Fixture tự cộng lại summary cho đúng lát cắt đang lấy.
      const rows = buckets.map(normalizeRow);
      const apiSummary = rows.reduce(
        (acc, r) => {
          for (const k of Object.keys(acc)) acc[k] += r[k] || 0;
          return acc;
        },
        { revenue: 0, capital: 0, profit: 0, adsAmount: 0, feeMarketplace: 0, shippingFee: 0, netOrderCount: 0 },
      );
      return { rows, apiSummary };
    },
  };
}

/**
 * Adapter gọi REST thật.
 *
 * Phần ĐỌC phản hồi đã đúng — parseResponse bám theo phản hồi thật.
 * Phần GỬI yêu cầu thì CHƯA KIỂM CHỨNG: base URL và tên tham số khoá dưới đây chưa
 * đối chiếu được với tài liệu nào, vì trong phiên dựng module này Pancake chỉ tiếp cận
 * được qua MCP. Xem agent/README.md trước khi bật.
 */
function restSource({ baseUrl, apiKey, fetchImpl = globalThis.fetch }) {
  if (!baseUrl) throw new Error('restSource: thiếu baseUrl');
  if (!apiKey) throw new Error('restSource: thiếu apiKey');

  return {
    name: 'rest',
    async fetchPeriod({ shopId, since, until }) {
      const url = new URL(`${baseUrl.replace(/\/$/, '')}/shops/${shopId}/analytics/sale`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('since', since);
      url.searchParams.set('until', until);
      url.searchParams.set('split_by', SPLIT_BY.join(','));
      url.searchParams.set('select_fields', SELECT_FIELDS.join(','));

      const res = await fetchImpl(url, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Pancake trả ${res.status} ${res.statusText} cho shop ${shopId}`);
      }
      return parseResponse(await res.json());
    },
  };
}

module.exports = {
  SELECT_FIELDS, SPLIT_BY, DAY_KEY,
  normalizeBucket, normalizeRow, normalizeSummary, parseResponse,
  fixtureSource, restSource,
};
