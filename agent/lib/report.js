'use strict';

const vnd = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

function money(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${vnd.format(Math.round(value))} đ`;
}

function pct(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1).replace('.', ',')}%`;
}

function delta(entry) {
  if (!entry || typeof entry.changePct !== 'number') return 'không có kỳ trước';
  const sign = entry.changePct >= 0 ? '+' : '';
  return `${sign}${(entry.changePct * 100).toFixed(1).replace('.', ',')}%`;
}

/**
 * Dựng báo cáo Markdown. Phần đầu là bảng do code tính; phần sau là chữ của model.
 * Trạng thái kiểm chứng đặt ngay đầu file — người đọc thấy trước khi đọc số.
 */
function render({ figures, narrative, verification, usage, model }) {
  const { totals, derived, comparison, period, shop } = figures;

  const banner =
    verification.status === 'verified'
      ? '> Đã kiểm chứng — mọi con số trong phần diễn giải đều truy được về số liệu gốc.'
      : `> **CHƯA KIỂM CHỨNG** — ${verification.untraceable.length} con số không truy được về số liệu gốc: ${verification.untraceable.join(', ')}. Đừng dùng bản này để ra quyết định trước khi có người rà lại.`;

  return `# Báo cáo vận hành — ${shop.name}

${banner}

Kỳ: ${period.since.slice(0, 10)} → ${period.until.slice(0, 10)} (${period.days} ngày) · shop \`${shop.id}\`

## Số liệu

| Chỉ số | Kỳ này | So kỳ trước |
| --- | ---: | ---: |
| Doanh thu | ${money(totals.revenue)} | ${delta(comparison.revenue)} |
| Giá vốn | ${money(totals.capital)} | ${delta(comparison.capital)} |
| Lợi nhuận gộp | ${money(totals.profit)} | ${delta(comparison.profit)} |
| Chi phí quảng cáo | ${money(totals.adsAmount)} | ${delta(comparison.adsAmount)} |
| **Lợi nhuận sau quảng cáo** | **${money(derived.netProfit)}** | ${delta(comparison.netProfit)} |
| Phí sàn | ${money(totals.feeMarketplace)} | ${delta(comparison.feeMarketplace)} |
| Đơn chốt | ${vnd.format(totals.orderCount)} | ${delta(comparison.orderCount)} |
| Đơn hoàn | ${vnd.format(totals.returnedOrderCount)} | ${delta(comparison.returnedOrderCount)} |
| Tỷ lệ hoàn | ${pct(derived.returnRatePct)} | ${delta(comparison.returnRatePct)} |
| Biên lợi nhuận | ${pct(derived.marginPct)} | ${delta(comparison.marginPct)} |
| Quảng cáo / Doanh thu | ${pct(derived.adsRatioPct)} | ${delta(comparison.adsRatioPct)} |
| Giá trị đơn trung bình | ${money(derived.avgOrderValue)} | ${delta(comparison.avgOrderValue)} |

## Diễn giải

${narrative}

---

Model \`${model}\` · vào ${usage.input_tokens} tokens (cache đọc ${usage.cache_read_input_tokens ?? 0}) · ra ${usage.output_tokens} tokens
`;
}

module.exports = { render, money, pct, delta };
