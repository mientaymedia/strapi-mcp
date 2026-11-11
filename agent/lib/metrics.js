'use strict';

/**
 * Tầng tính toán. Luật xuyên suốt của hệ: SỐ DO CODE TÍNH, CHỮ DO MODEL VIẾT.
 * Không có đường nào cho model tự cộng trừ rồi đưa vào báo cáo.
 */

/** Sai số cho phép khi đối chiếu một con số model viết với số harness tính. */
const TOLERANCE = 0.005; // 0,5%

const SUM_FIELDS = [
  'revenue',
  'capital',
  'profit',
  'adsAmount',
  'feeMarketplace',
  'shippingFee',
  'orderCount',
  'returnedOrderCount',
  'netOrderCount',
];

/**
 * Cộng các dòng theo ngày thành tổng kỳ. Chỉ cộng, không suy diễn.
 * @param {Array<object>} rows dòng đã chuẩn hoá từ tầng nguồn
 */
function totals(rows) {
  const out = Object.fromEntries(SUM_FIELDS.map((f) => [f, 0]));
  for (const row of rows) {
    for (const f of SUM_FIELDS) out[f] += Number(row[f]) || 0;
  }
  return out;
}

/** Chia an toàn — kỳ không có đơn nào thì trả null, không trả NaN hay 0 giả. */
function ratio(numerator, denominator) {
  if (!denominator) return null;
  return numerator / denominator;
}

/**
 * Các chỉ số dẫn xuất. Mỗi cái được tính ở đây một lần, và chỉ ở đây,
 * để con số trong báo cáo và con số trong danh sách kiểm chứng không thể lệch nhau.
 */
function derive(sum) {
  const netProfit = sum.profit - sum.adsAmount;
  return {
    netProfit,
    marginPct: ratio(sum.profit, sum.revenue),
    netMarginPct: ratio(netProfit, sum.revenue),
    adsRatioPct: ratio(sum.adsAmount, sum.revenue),
    returnRatePct: ratio(sum.returnedOrderCount, sum.orderCount),
    avgOrderValue: ratio(sum.revenue, sum.orderCount),
    roas: ratio(sum.revenue, sum.adsAmount),
  };
}

/** So kỳ này với kỳ trước. delta null nghĩa là không so được, không phải bằng 0. */
function compare(current, previous) {
  const out = {};
  for (const key of Object.keys(current)) {
    const now = current[key];
    const before = previous ? previous[key] : undefined;
    if (typeof now !== 'number' || typeof before !== 'number' || !before) {
      out[key] = { value: now, previous: before ?? null, changePct: null };
      continue;
    }
    out[key] = { value: now, previous: before, changePct: (now - before) / before };
  }
  return out;
}

/**
 * Đối chiếu tổng harness tự cộng với tổng do chính API cộng (`summary`).
 * Hai phép cộng độc lập trên cùng dữ liệu; lệch nhau nghĩa là tầng nguồn đọc sai
 * bucket, hoặc API trả thiếu ngày. Bắt được đúng loại lỗi im lặng đã xảy ra một lần.
 */
function reconcile(sum, apiSummary, tolerance = TOLERANCE) {
  if (!apiSummary) return { status: 'skipped', reason: 'API không trả summary', mismatches: [] };
  const mismatches = [];
  for (const field of Object.keys(apiSummary)) {
    const ours = sum[field];
    const theirs = apiSummary[field];
    if (typeof ours !== 'number' || typeof theirs !== 'number') continue;
    const diff = Math.abs(ours - theirs);
    const scale = Math.abs(theirs) || Math.abs(ours);
    if (scale === 0) continue;
    if (diff / scale > tolerance) mismatches.push({ field, ours, theirs });
  }
  return {
    status: mismatches.length === 0 ? 'ok' : 'mismatch',
    reason: null,
    mismatches,
  };
}

/**
 * Dựng bộ số liệu hoàn chỉnh cho một kỳ. Đây là thứ duy nhất được đưa cho model,
 * và cũng là thứ duy nhất model được phép trích dẫn.
 */
function buildFigures({ rows, previousRows = null, apiSummary = null, shop, since, until }) {
  const sum = totals(rows);
  const derived = derive(sum);
  const prevSum = previousRows ? totals(previousRows) : null;
  const prevDerived = prevSum ? derive(prevSum) : null;

  return {
    shop,
    period: { since, until, days: rows.length },
    reconciliation: reconcile(sum, apiSummary),
    totals: sum,
    derived,
    comparison: compare({ ...sum, ...derived }, prevSum ? { ...prevSum, ...prevDerived } : null),
    daily: rows,
  };
}

/**
 * Mọi giá trị số mà model được phép viết ra. Bất kỳ con số nào ngoài tập này
 * đều bị coi là model tự bịa, kể cả khi nó trông hợp lý.
 */
function citableValues(figures) {
  const values = new Set();
  const add = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) values.add(Math.abs(v));
  };

  for (const v of Object.values(figures.totals)) add(v);
  for (const v of Object.values(figures.derived)) {
    add(v);
    if (typeof v === 'number') add(v * 100); // tỷ lệ viết dưới dạng phần trăm
  }
  for (const entry of Object.values(figures.comparison)) {
    add(entry.value);
    add(entry.previous);
    add(entry.changePct);
    if (typeof entry.changePct === 'number') add(entry.changePct * 100);
  }
  for (const row of figures.daily) {
    for (const v of Object.values(row)) add(v);
  }

  // Số ngày, số thứ tự và năm — model cần để diễn đạt, không phải số liệu kinh doanh.
  for (let i = 0; i <= 31; i += 1) values.add(i);
  const year = new Date(figures.period.since).getUTCFullYear();
  values.add(year);
  values.add(year - 1);

  return values;
}

/**
 * Bóc mọi token số ra khỏi văn bản tiếng Việt.
 * Quy ước vi-VN: dấu chấm ngăn hàng nghìn, dấu phẩy ngăn thập phân.
 */
function extractNumbers(text) {
  const found = [];
  const re = /\d[\d.,]*/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0].replace(/[.,]+$/, '');
    if (!raw) continue;
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const value = Number(normalized);
    if (Number.isFinite(value)) found.push({ raw, value });
  }
  return found;
}

/** Một con số truy được nguồn khi nó nằm trong 0,5% của một giá trị harness đã tính. */
function isTraceable(value, allowed, tolerance = TOLERANCE) {
  const target = Math.abs(value);
  for (const candidate of allowed) {
    if (candidate === 0) {
      if (target === 0) return true;
      continue;
    }
    if (Math.abs(target - candidate) / candidate <= tolerance) return true;
  }
  return false;
}

/**
 * Cổng chặn cuối. Chạy sau khi model viết xong, trước khi báo cáo tới tay người.
 * Trả về trạng thái verified hoặc unverified kèm đúng những con số không truy được.
 */
function verifyNarrative(narrative, figures, tolerance = TOLERANCE) {
  const allowed = citableValues(figures);
  const untraceable = [];
  for (const { raw, value } of extractNumbers(narrative)) {
    if (!isTraceable(value, allowed, tolerance)) untraceable.push(raw);
  }
  return {
    status: untraceable.length === 0 ? 'verified' : 'unverified',
    untraceable,
    checked: allowed.size,
  };
}

module.exports = {
  TOLERANCE,
  totals,
  derive,
  compare,
  reconcile,
  buildFigures,
  citableValues,
  extractNumbers,
  isTraceable,
  verifyNarrative,
};
