'use strict';

/**
 * Import THE FRIENDS seed content into this Strapi 5 instance.
 *
 *   node scripts/import-thefriends.js
 *
 * Boots Strapi in-process and uses the document service, so it needs no API
 * token and no running dev server. Stop `npm run develop` first: two processes
 * writing the same SQLite file will fight.
 *
 * Idempotent: entries are matched on `slug`, so a re-run updates instead of
 * duplicating. Images are uploaded once and reused by filename.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SITE = path.resolve(__dirname, '..', 'thefriends');
const SEED = path.join(SITE, 'scripts', 'seed-export.json');
const PUBLIC = path.join(SITE, 'public');

const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

/** Cache so the same cover shared by two entries is uploaded only once. */
const uploaded = new Map();

async function uploadImage(app, webPath) {
  if (!webPath) return null;
  if (uploaded.has(webPath)) return uploaded.get(webPath);

  const abs = path.join(PUBLIC, webPath.replace(/^\//, ''));
  if (!fs.existsSync(abs)) {
    console.warn('  ! missing image', webPath);
    uploaded.set(webPath, null);
    return null;
  }

  const name = path.basename(abs);
  const existing = await app.documents('plugin::upload.file').findMany({
    filters: { name },
    limit: 1,
  });
  if (existing.length) {
    uploaded.set(webPath, existing[0].id);
    return existing[0].id;
  }

  // The upload service consumes a temp copy, so hand it one it may move.
  const tmp = path.join(os.tmpdir(), `tf-${Date.now()}-${name}`);
  fs.copyFileSync(abs, tmp);

  const [file] = await app.plugin('upload').service('upload').upload({
    data: {},
    files: {
      filepath: tmp,
      originalFilename: name,
      mimetype: name.endsWith('.png') ? 'image/png' : 'image/jpeg',
      size: fs.statSync(tmp).size,
    },
  });
  uploaded.set(webPath, file.id);
  return file.id;
}

/** Create or update by slug, then publish. */
async function upsert(app, uid, slug, data) {
  const found = await app.documents(uid).findMany({ filters: { slug }, limit: 1, status: 'draft' });
  if (found.length) {
    return app.documents(uid).update({
      documentId: found[0].documentId,
      data,
      status: 'published',
    });
  }
  return app.documents(uid).create({ data: { ...data, slug }, status: 'published' });
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const context = await compileStrapi();
  const app = await createStrapi(context).load();
  app.log.level = 'error';

  try {
    // ---------------------------------------------------------- speakers
    console.log(`speakers (${seed.speakers.length})`);
    const speakerIdBySlug = new Map();
    for (const s of seed.speakers) {
      const avatar = await uploadImage(app, s.avatar);
      const doc = await upsert(app, 'api::speaker.speaker', s.slug, {
        name: s.name,
        title: s.title ?? null,
        bio: s.bio ?? null,
        expertise: s.expertise ?? [],
        company: s.company ?? null,
        ...(avatar ? { avatar } : {}),
      });
      speakerIdBySlug.set(s.slug, doc.documentId);
    }

    // Seed events/courses reference speakers by their seed id, not slug.
    const slugBySeedId = new Map(seed.speakers.map((s) => [s.id, s.slug]));
    const docIdForSeedSpeaker = (seedId) => speakerIdBySlug.get(slugBySeedId.get(seedId));

    // ------------------------------------------------------------ events
    console.log(`events (${seed.events.length})`);
    for (const e of seed.events) {
      const coverImage = await uploadImage(app, e.coverImage);
      await upsert(app, 'api::event.event', e.slug, {
        title: e.title,
        summary: e.summary,
        description: e.description,
        category: e.category,
        date: e.date,
        endDate: e.endDate ?? null,
        startTime: e.startTime ?? null,
        endTime: e.endTime ?? null,
        location: e.location,
        locationName: e.locationName ?? null,
        format: e.format,
        organizer: e.organizer ?? 'THE FRIENDS',
        capacity: e.capacity ?? null,
        registeredCount: e.registeredCount ?? null,
        eventStatus: e.status,
        registrationDeadline: e.registrationDeadline ?? null,
        price: e.price ?? null,
        drinkIncluded: e.drinkIncluded ?? null,
        groupUrl: e.groupUrl ?? null,
        agenda: (e.agenda ?? []).map((a) => ({
          time: a.time ?? null,
          title: a.title,
          description: a.description ?? null,
        })),
        whoShouldAttend: e.whoShouldAttend ?? [],
        tags: e.tags ?? [],
        featured: Boolean(e.featured),
        speakers: (e.speakers ?? []).map((s) => docIdForSeedSpeaker(s.id)).filter(Boolean),
        ...(coverImage ? { coverImage } : {}),
      });
    }

    // ----------------------------------------------------------- courses
    console.log(`courses (${seed.courses.length})`);
    for (const c of seed.courses) {
      const thumbnail = await uploadImage(app, c.thumbnail);
      await upsert(app, 'api::course.course', c.slug, {
        title: c.title,
        shortDescription: c.shortDescription,
        fullDescription: c.fullDescription,
        category: c.category,
        duration: c.duration,
        level: c.level,
        // `id` is reserved on Strapi components, hence sessionId.
        schedule: (c.schedule ?? []).map((s) => ({
          sessionId: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.title ?? null,
        })),
        format: c.format,
        meetingProvider: c.meetingProvider ?? null,
        location: c.location ?? null,
        locationName: c.locationName ?? null,
        zoomUrl: c.zoomUrl ?? null,
        registrationRequired: c.registrationRequired !== false,
        maxAttendees: c.maxAttendees ?? null,
        registeredCount: c.registeredCount ?? null,
        courseStatus: c.status,
        materials: (c.materials ?? []).map((m) => ({ title: m.title, url: m.url, source: null })),
        references: (c.references ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          source: r.source ?? null,
        })),
        tags: c.tags ?? [],
        featured: Boolean(c.featured),
        instructor: docIdForSeedSpeaker(c.instructor?.id) ?? null,
        ...(thumbnail ? { thumbnail } : {}),
      });
    }

    // ---------------------------------------------------------- articles
    console.log(`articles (${seed.articles.length})`);
    for (const a of seed.articles) {
      const thumbnail = await uploadImage(app, a.thumbnail);
      await upsert(app, 'api::knowledge-article.knowledge-article', a.slug, {
        title: a.title,
        category: a.category,
        summary: a.summary,
        content: a.content,
        author: a.author ?? 'THE FRIENDS',
        tags: a.tags ?? [],
        sourceName: a.sourceName ?? null,
        sourceUrl: a.sourceUrl ?? null,
        isSourceLinked: Boolean(a.isSourceLinked),
        featured: Boolean(a.featured),
        ...(thumbnail ? { thumbnail } : {}),
      });
    }

    console.log(`\nimages uploaded/reused: ${uploaded.size}`);
    console.log('done');
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
