#!/usr/bin/env bash
# SessionStart hook: make this Strapi project runnable in a fresh checkout
# (Claude Code on the web starts from a clean clone with no node_modules
# and no .env, and Strapi refuses to boot without either).
#
# Idempotent and safe to run on every session start: it does nothing when
# the project is already set up.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# 1. Dependencies -----------------------------------------------------------
if [ ! -d node_modules ]; then
  echo "Installing dependencies (npm ci)..."
  if ! npm ci --no-audit --no-fund >/tmp/strapi-npm-ci.log 2>&1; then
    echo "npm ci failed; see /tmp/strapi-npm-ci.log. Run 'npm install' manually."
  fi
fi

# 2. Local environment ------------------------------------------------------
# .env is gitignored and holds secrets. Generate throwaway local values so
# 'npm run develop' and 'npm run build' work; never reuse these anywhere real.
if [ ! -f .env ] && [ -f .env.example ]; then
  secret() { node -e 'console.log(require("crypto").randomBytes(16).toString("base64"))'; }
  {
    echo "HOST=0.0.0.0"
    echo "PORT=1337"
    echo "APP_KEYS=$(secret),$(secret)"
    echo "API_TOKEN_SALT=$(secret)"
    echo "ADMIN_JWT_SECRET=$(secret)"
    echo "TRANSFER_TOKEN_SALT=$(secret)"
    echo "JWT_SECRET=$(secret)"
    echo "ENCRYPTION_KEY=$(secret)"
  } > .env
  echo "Generated a local .env with throwaway development secrets."
fi

exit 0
