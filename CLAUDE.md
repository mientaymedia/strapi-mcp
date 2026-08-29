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
npm run deploy     # deploy to Strapi Cloud
npm run upgrade:dry   # preview a Strapi version upgrade (drop :dry to apply)
npm run strapi -- <cmd>   # any Strapi CLI command, e.g. `npm run strapi -- ts:generate-types`
```

(`npm run dev` is an alias of `develop`.)

There is **no test suite, linter, or formatter configured** in this project.
Do not invent `npm test` / `npm run lint` — they do not exist. To verify a
change, run `npm run build` and/or start `npm run develop` and check it boots.

Node must be `>=20 <=26` (see `engines` in package.json).

## Environment

**A `.env` is probably already there.** The SessionStart hook in
[.claude/hooks/session-start.sh](.claude/hooks/session-start.sh) installs
dependencies and writes a `.env` of throwaway development secrets when one is
missing. Check before creating your own — overwriting a working `.env` with the
`tobemodified` placeholders breaks the boot, and changing `ENCRYPTION_KEY`
after the fact makes already-encrypted admin values undecryptable.

Only if it is genuinely absent:

```bash
cp .env.example .env
```

Then replace every `tobemodified` with a random string. `APP_KEYS` and
`API_TOKEN_SALT` are hard requirements — Strapi throws at boot without them.
Missing `TRANSFER_TOKEN_SALT` or `ENCRYPTION_KEY` only warns, disabling data
transfer and secret encryption respectively, so set them anyway.

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
- Nothing enforces formatting, so match the surrounding file: two spaces,
  semicolons, single quotes.

## Notes on specific config

- **MCP** is enabled under `mcp` in `config/server.js`. Strapi mounts the
  server at `/mcp` (the boot log prints `[MCP] Server available at /mcp`;
  the path is hardcoded). `connectTimeoutMs` (default 5000) and `requestTimeoutMs`
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
