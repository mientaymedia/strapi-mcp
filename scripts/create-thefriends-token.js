'use strict';

/**
 * Create a read-only Strapi API token for the THE FRIENDS website and write it
 * straight into thefriends/.env.local.
 *
 *   node scripts/create-thefriends-token.js
 *
 * The token value is never printed: it goes to the gitignored env file and the
 * script reports only a masked prefix, because a full-access string in a
 * terminal log is a leak waiting to happen.
 *
 * Re-running revokes the previous token of the same name and issues a new one.
 */

const fs = require('node:fs');
const path = require('node:path');

const TOKEN_NAME = 'thefriends-web-read';
const ENV_FILE = path.resolve(__dirname, '..', 'thefriends', '.env.local');
const STRAPI_URL = process.env.STRAPI_PUBLIC_URL || 'http://localhost:1337';

/** find + findOne on the four editorial collections, nothing else. */
const PERMISSIONS = [
  'api::event.event',
  'api::course.course',
  'api::knowledge-article.knowledge-article',
  'api::speaker.speaker',
].flatMap((uid) => [`${uid}.find`, `${uid}.findOne`]);

function upsertEnv(file, entries) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  let out = existing;
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    out = re.test(out) ? out.replace(re, line) : `${out.replace(/\s*$/, '')}\n${line}\n`;
  }
  fs.writeFileSync(file, out.startsWith('\n') ? out.slice(1) : out, 'utf8');
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const app = await createStrapi(await compileStrapi()).load();
  app.log.level = 'error';

  try {
    const service = app.service('admin::api-token');

    const existing = await service.getByName(TOKEN_NAME);
    if (existing) {
      await service.revoke(existing.id);
      console.log(`revoked the previous "${TOKEN_NAME}" token`);
    }

    const token = await service.create({
      name: TOKEN_NAME,
      description: 'Read-only access for the THE FRIENDS Next.js website',
      type: 'custom',
      lifespan: null,
      permissions: PERMISSIONS,
    });

    upsertEnv(ENV_FILE, {
      STRAPI_URL,
      STRAPI_API_TOKEN: token.accessKey,
      STRAPI_REVALIDATE_SECONDS: '60',
    });

    console.log(`created "${TOKEN_NAME}" (${PERMISSIONS.length} permissions)`);
    console.log(`token starts with ${token.accessKey.slice(0, 6)}… and was written to`);
    console.log(`  ${ENV_FILE}`);
    console.log('That file is gitignored. The value is not printed in full on purpose.');
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
