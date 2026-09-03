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

/** Kỳ này và kỳ liền trước cùng độ dài, để so sánh không lệch số ngày. */
function periods(until, days) {
  const end = new Date(`${until}T23:59:59Z`);
  const msDay = 86400000;
  const startCurrent = new Date(end.getTime() - (days - 1) * msDay);
  const endPrevious = new Date(startCurrent.getTime() - msDay);
  const startPrevious = new Date(endPrevious.getTime() - (days - 1) * msDay);
  const iso = (d) => d.toISOString();
  return {
    current: { since: iso(startCurrent).slice(0, 10) + 'T00:00:00Z', until: iso(end) },
    previous: {
      since: iso(startPrevious).slice(0, 10) + 'T00:00:00Z',
      until: iso(endPrevious).slice(0, 10) + 'T23:59:59Z',
    },
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

  const rows = await source.fetchDaily({ shopId: shop.id, ...range.current });
  if (rows.length === 0) {
    throw new Error(`Không có dữ liệu cho shop ${shop.id} trong kỳ ${range.current.since} → ${until}`);
  }
  const previousRows = await source.fetchDaily({ shopId: shop.id, ...range.previous });

  const figures = buildFigures({
    rows,
    previousRows: previousRows.length ? previousRows : null,
    shop,
    since: range.current.since,
    until: range.current.until,
  });

  // --dry dừng ở đây: chứng minh nửa tất định chạy đúng mà không tốn một đồng API nào.
  if (args.dry) {
    return { figures, narrative: null, verification: null };
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
