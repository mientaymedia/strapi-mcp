# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The Strapi CMS backend for **Mien Tay Media**. Strapi `5.51.2`, plain
JavaScript (CommonJS), SQLite by default, with the Strapi MCP server enabled
in [config/server.js](config/server.js).

There is no content in `src/api/` yet — content types are created through the
Strapi admin UI (`/admin`), which writes the schema files back into
`src/api/<name>/`.

## Commands

```bash
npm install        # install dependencies (npm ci if package-lock.json is authoritative)
npm run develop    # dev server with autoReload + admin panel rebuild (http://localhost:1337)
npm run build      # build the admin panel
npm run start      # production server (no autoReload)
npm run console    # Strapi REPL against the local database
npm run strapi -- <cmd>   # any Strapi CLI command, e.g. `npm run strapi -- ts:generate-types`
```

There is **no test suite, linter, or formatter configured** in this project.
Do not invent `npm test` / `npm run lint` — they do not exist. To verify a
change, run `npm run build` and/or start `npm run develop` and check it boots.

Node must be `>=20 <=26` (see `engines` in package.json).

## Environment

`npm run develop` will not boot without a `.env`. Create one from the
template and fill in real values:

```bash
cp .env.example .env
```

`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`,
`JWT_SECRET`, and `ENCRYPTION_KEY` are all required. For local work any
random strings will do; generate them rather than committing the
`tobemodified` placeholders.

`.env`, `.mcp.json`, and `.tmp/` are gitignored because they hold secrets or
local state. Never commit them, and never paste their contents into a commit
message, PR body, or code comment.

## Layout

| Path | What lives there |
| --- | --- |
| `config/` | Runtime config, one module per concern (`server`, `admin`, `database`, `api`, `middlewares`, `plugins`) |
| `src/api/` | Content types — each gets `content-types/`, `controllers/`, `routes/`, `services/` |
| `src/extensions/` | Overrides of plugin behaviour |
| `src/admin/` | Admin panel customisation (currently only `.example.js` files — copy to drop the suffix before editing) |
| `src/index.js` | `register()` / `bootstrap()` lifecycle hooks |
| `database/migrations/` | Knex migrations (empty apart from `.gitkeep`) |
| `types/generated/` | **Generated** — regenerate with `npm run strapi -- ts:generate-types`, never hand-edit |
| `public/` | Statically served files and uploads |

## Conventions

- **CommonJS only.** `module.exports = ...`, `require(...)`. No ESM syntax.
- Config files that need environment values export a factory taking
  `{ env }`: `module.exports = ({ env }) => ({ ... })`. Read every tunable
  through `env(...)` / `env.int(...)` / `env.bool(...)` / `env.array(...)`
  with a sensible default — never hardcode a host, port, or credential.
- `jsconfig.json` sets `checkJs: true`, so JSDoc annotations are type
  checked. Keep the existing `/** @import { Core } from '@strapi/strapi' */`
  style when adding typed config.
- Two spaces, semicolons, single quotes — match the surrounding file.

## Notes on specific config

- **MCP** is enabled under `mcp` in `config/server.js`. Strapi mounts the
  server at `/mcp` (look for `[MCP] Server available at /mcp` in the boot
  log). `connectTimeoutMs` (default 5000) and `requestTimeoutMs`
  (default 60000) are the available knobs.
  A local `.mcp.json` wiring a client to it is gitignored — it carries an API
  token.
- **`config/api.js`** turns on `strictParams` and `strictRelations`. Unknown
  query params and relations are rejected rather than silently ignored — if a
  REST call starts 400ing, check this first.
- **`config/plugins.js`** restricts uploads to an allowlist of media types
  and explicitly denies executables. Widen `allowedMediaTypes` deliberately;
  do not remove `deniedExecutableTypes`.
- **`config/database.js`** picks a connection by `DATABASE_CLIENT`
  (`sqlite` | `postgres` | `mysql`) and throws on anything else. SQLite lands
  in `.tmp/data.db`.
