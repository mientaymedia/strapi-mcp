'use strict';

/**
 * Tầng nguồn Pancake POS — CHỈ ĐỌC.
 *
 * Ánh xạ dưới đây lấy từ schema thật của `pos_statistics.list_analytics_sale`
 * (kiểm chứng ngày 2026-09-03), không phải suy đoán:
 *
 *   - trường có tiền tố success_/returned_ đọc ở data.success.<hậu tố>
 *     và data.returned.<hậu tố>; khi gọi chỉ truyền hậu tố.
 *   - trường thường đọc thẳng ở data.<tên>.
 *
 * Chưa có tài khoản thì dùng adapter `fixture` để chạy trọn đường ống.
 */

const SELECT_FIELDS = [
  'revenue',
  'capital',
  'profit',
  'ads_amount',
  'fee_marketplace',
  'shipping_fee',
  'order_count', // bucketed: cho cả success lẫn returned trong một lần gọi
];

const SPLIT_BY = ['Time.day'];

/** Đưa một bucket thô của Pancake về đúng hình dạng mà tầng tính toán cần. */
function normalizeRow(bucket) {
  const data = bucket.data || {};
  const success = data.success || {};
  const returned = data.returned || {};
  return {
    date: bucket.key || bucket.date,
    revenue: Number(data.revenue) || 0,
    capital: Number(data.capital) || 0,
    profit: Number(data.profit) || 0,
    adsAmount: Number(data.ads_amount) || 0,
    feeMarketplace: Number(data.fee_marketplace) || 0,
    shippingFee: Number(data.shipping_fee) || 0,
    orderCount: Number(success.order_count) || 0,
    returnedOrderCount: Number(returned.order_count) || 0,
  };
}

/**
 * Adapter đọc từ file — dùng để phát triển và chạy test mà không cần thật.
 */
function fixtureSource(fixturePath) {
  const payload = require(fixturePath);
  return {
    name: 'fixture',
    async fetchDaily({ shopId, since, until }) {
      const buckets = (payload[String(shopId)] || []).filter(
        (b) => b.key >= since.slice(0, 10) && b.key <= until.slice(0, 10),
      );
      return buckets.map(normalizeRow);
    },
  };
}

/**
 * Adapter gọi REST thật.
 *
 * CHƯA KIỂM CHỨNG ĐƯỢC ĐƯỜNG DẪN VÀ CÁCH XÁC THỰC: trong phiên dựng module này,
 * Pancake POS chỉ tiếp cận được qua MCP, không qua REST trực tiếp, nên base URL
 * và tên tham số khoá dưới đây là chỗ cần đối chiếu tài liệu trước khi bật chạy.
 * Hình dạng phản hồi thì đã đúng — normalizeRow bám theo schema thật.
 */
function restSource({ baseUrl, apiKey, fetchImpl = globalThis.fetch }) {
  if (!baseUrl) throw new Error('restSource: thiếu baseUrl');
  if (!apiKey) throw new Error('restSource: thiếu apiKey');

  return {
    name: 'rest',
    async fetchDaily({ shopId, since, until }) {
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
      const body = await res.json();
      if (body.success === false) {
        throw new Error(`Pancake báo lỗi cho shop ${shopId}: ${body.message || 'không rõ'}`);
      }
      return (body.data || []).map(normalizeRow);
    },
  };
}

module.exports = { SELECT_FIELDS, SPLIT_BY, normalizeRow, fixtureSource, restSource };
