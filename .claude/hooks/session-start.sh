#!/usr/bin/env bash
# SessionStart hook: make this Strapi project runnable in a fresh checkout.
#
# Claude Code on the web starts from a clean clone: no node_modules, and no
# .env (it is gitignored), without which Strapi refuses to boot. This installs
# the first and generates a throwaway local copy of the second.
#
# Both steps are guarded, so re-running on resume/clear/compact is a silent
# no-op. Deliberately not `set -e`: a failed install should leave a session
# that starts with a warning, not one that is dead on arrival.
set -uo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)" || exit 0

# 1. Dependencies -----------------------------------------------------------
# node_modules alone is not proof of a good install: a hook killed mid-`npm ci`
# leaves a partial tree behind. Check for a binary npm links only on success.
if [ ! -x node_modules/.bin/strapi ]; then
  echo "Installing dependencies (npm ci)..."
  if ! npm ci --no-audit --no-fund >/tmp/strapi-npm-ci.log 2>&1; then
    echo "npm ci failed; see /tmp/strapi-npm-ci.log. Run 'npm install' manually."
  fi
fi

# 2. Local environment ------------------------------------------------------
# .env is gitignored and holds secrets. Generate throwaway local values so
# 'npm run develop' and 'npm run build' work; never reuse these anywhere real.
if [ ! -e .env ]; then
  # Generate every secret up front and require all of them. If node is missing,
  # `$(...)` expands to nothing, and a .env with empty values would fail at boot
  # with a confusing "App keys are required" that re-running would never repair.
  ok=1
  for name in KEY1 KEY2 API_TOKEN_SALT ADMIN_JWT_SECRET TRANSFER_TOKEN_SALT JWT_SECRET ENCRYPTION_KEY; do
    value=$(node -e 'process.stdout.write(require("crypto").randomBytes(16).toString("base64"))' 2>/dev/null)
    [ -n "$value" ] || ok=0
    eval "SECRET_$name=\$value"
  done

  if [ "$ok" -eq 0 ]; then
    echo "Could not generate .env (is node on PATH?). Copy .env.example and fill it in."
  # Write via a temp file: a partial write must not leave a broken .env behind,
  # because the guard above would make every later run skip past it.
  elif {
    echo "HOST=0.0.0.0"
    echo "PORT=1337"
    echo "APP_KEYS=$SECRET_KEY1,$SECRET_KEY2"
    echo "API_TOKEN_SALT=$SECRET_API_TOKEN_SALT"
    echo "ADMIN_JWT_SECRET=$SECRET_ADMIN_JWT_SECRET"
    echo "TRANSFER_TOKEN_SALT=$SECRET_TRANSFER_TOKEN_SALT"
    echo "JWT_SECRET=$SECRET_JWT_SECRET"
    echo "ENCRYPTION_KEY=$SECRET_ENCRYPTION_KEY"
  } > ".env.tmp.$$" && mv ".env.tmp.$$" .env; then
    echo "Generated a local .env with throwaway development secrets."
  else
    rm -f ".env.tmp.$$"
    echo "Could not write .env. Copy .env.example and fill it in."
  fi
fi

exit 0
