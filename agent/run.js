#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const { findShop, activeShops } = require('./config');
const { fixtureSource, restSource } = require('./sources/pancake');
const { buildFigures, verifyNarrative } = require('./lib/metrics');
const { render } = require('./lib/report');

function parseArgs(argv) {
  const args = { source: 'fixture', days: 14, dry: false };
  for (const arg of argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'dry') args.dry = true;
    else if (key === 'days') args.days = Number(value);
    else args[key] = value;
  }
  return args;
}

/**
 * Múi giờ chia ngày của Pancake. Xác định bằng ba phép thử trên dữ liệu thật
 * (2026-09-03) — chi tiết trong agent/README.md:
 *
 *   gửi 28T00:00Z → 30T23:59Z  ⇒  nhận bucket 28, 29, 30, 31
 *   gửi 28T17:00Z → 29T16:59Z  ⇒  nhận đúng một bucket 29
 *   gửi 29T00:00Z → 29T23:59Z  ⇒  cũng chỉ một bucket 29
 *
 * Kết luận khớp cả ba: mốc thời gian được tôn trọng đúng như gửi, nhưng ngày
 * được gán nhãn theo giờ VN. Dựng mốc theo ngày UTC là lệch 7 tiếng, và kỳ báo
 * cáo sẽ dính một ngày cụt ở biên.
 *
 * Việt Nam không có giờ mùa hè nên độ lệch là hằng số; đừng thay bằng
 * getTimezoneOffset() của máy chạy.
 */
const TZ_OFFSET_HOURS = 7;

const MS_DAY = 86400000;
const MS_HOUR = 3600000;

/**
 * Kỳ này và kỳ liền trước, cùng độ dài, cắt theo NGÀY LỊCH VIỆT NAM.
 * Trả về cả mốc UTC để gửi đi lẫn nhãn ngày VN để lọc và để in ra báo cáo.
 */
function periods(until, days, offsetHours = TZ_OFFSET_HOURS) {
  const endDay = Date.parse(`${until}T00:00:00Z`); // 00:00 giờ VN của ngày `until`
  if (Number.isNaN(endDay)) throw new Error(`Ngày không hợp lệ: ${until}`);
  if (!Number.isInteger(days) || days < 1) throw new Error(`--days phải là số nguyên dương, nhận: ${days}`);

  const startCurrentDay = endDay - (days - 1) * MS_DAY;
  const endPreviousDay = startCurrentDay - MS_DAY;
  const startPreviousDay = endPreviousDay - (days - 1) * MS_DAY;

  const label = (dayMs) => new Date(dayMs).toISOString().slice(0, 10);
  const utcStart = (dayMs) => new Date(dayMs - offsetHours * MS_HOUR).toISOString();
  const utcEnd = (dayMs) => new Date(dayMs + MS_DAY - 1000 - offsetHours * MS_HOUR).toISOString();

  const window = (fromDay, toDay) => ({
    since: utcStart(fromDay),
    until: utcEnd(toDay),
    sinceDate: label(fromDay),
    untilDate: label(toDay),
  });

  return {
    current: window(startCurrentDay, endDay),
    previous: window(startPreviousDay, endPreviousDay),
  };
}

function buildSource(name) {
  if (name === 'fixture') {
    return fixtureSource(path.join(__dirname, 'fixtures', 'sample-analytics.json'));
  }
  if (name === 'rest') {
    return restSource({
      baseUrl: process.env.PANCAKE_BASE_URL,
      apiKey: process.env.PANCAKE_API_KEY,
    });
  }
  throw new Error(`Nguồn không nhận ra: ${name}. Dùng fixture hoặc rest.`);
}

async function runShop(shop, args, source) {
  const until = args.until || new Date().toISOString().slice(0, 10);
  const range = periods(until, args.days);

  const { rows, apiSummary } = await source.fetchPeriod({ shopId: shop.id, ...range.current });
  if (rows.length === 0) {
    throw new Error(`Không có dữ liệu cho shop ${shop.id} trong kỳ ${range.current.since} → ${until}`);
  }
  const previous = await source.fetchPeriod({ shopId: shop.id, ...range.previous });

  // Nhãn kỳ lấy từ ngày thật của dữ liệu trả về, không lấy từ tham số yêu cầu:
  // API có thể trả lệch biên do múi giờ, và báo cáo phải nói đúng nó đã cộng những ngày nào.
  const dates = rows.map((r) => r.date).sort();

  const figures = buildFigures({
    rows,
    previousRows: previous.rows.length ? previous.rows : null,
    apiSummary,
    shop,
    since: `${dates[0]}T00:00:00Z`,
    until: `${dates[dates.length - 1]}T23:59:59Z`,
  });

  // --dry dừng ở đây: chứng minh nửa tất định chạy đúng mà không tốn một đồng API nào.
  if (args.dry) {
    return { figures, narrative: null, verification: null };
  }

  if (figures.reconciliation.status === 'mismatch') {
    const detail = figures.reconciliation.mismatches
      .map((m) => `${m.field}: harness ${m.ours} vs API ${m.theirs}`)
      .join('; ');
    throw new Error(`Tổng harness lệch tổng API — tầng nguồn đang đọc sai. ${detail}`);
  }

  const { narrate } = require('./lib/narrate');
  const { text, usage, model } = await narrate(figures);
  const verification = verifyNarrative(text, figures);

  return {
    figures,
    narrative: text,
    verification,
    markdown: render({ figures, narrative: text, verification, usage, model }),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const source = buildSource(args.source);
  const shops = args.shop ? [findShop(args.shop)] : activeShops();

  let failed = 0;
  for (const shop of shops) {
    try {
      const result = await runShop(shop, args, source);

      if (args.dry) {
        console.log(JSON.stringify(result.figures, null, 2));
        continue;
      }

      if (args.out) {
        const file = path.join(args.out, `${shop.id}-${args.until || 'latest'}.md`);
        fs.mkdirSync(args.out, { recursive: true });
        fs.writeFileSync(file, result.markdown);
        console.log(`${shop.name}: ${result.verification.status} → ${file}`);
      } else {
        console.log(result.markdown);
      }

      // Báo cáo chưa kiểm chứng vẫn được ghi ra, nhưng lượt chạy phải thất bại
      // để lịch chạy tự động không âm thầm phát số sai.
      if (result.verification.status !== 'verified') failed += 1;
    } catch (error) {
      failed += 1;
      console.error(`${shop.name}: ${error.message}`);
    }
  }

  process.exitCode = failed > 0 ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { parseArgs, periods, runShop };
