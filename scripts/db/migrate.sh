#!/usr/bin/env bash
# scripts/db/migrate.sh — apply Sherpa SQL migrations.
#
# Reads DATABASE_URL from env. Applies every .sql file in
# scripts/db/migrations/ in lexical order, tracking applied filenames in a
# `_migrations` table. Idempotent: already-applied files are skipped.
#
# Usage:
#   DATABASE_URL=postgres://... ./scripts/db/migrate.sh
#
# Requires `psql` on PATH. See docs/sherpa/setup/DATABASE_SETUP.md (P4).

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL not set" >&2
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not found on PATH" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "error: migrations dir not found at ${MIGRATIONS_DIR}" >&2
  exit 2
fi

# Bootstrap tracking table.
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS _migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

shopt -s nullglob
files=( "${MIGRATIONS_DIR}"/*.sql )
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "no migration files found"
  exit 0
fi

# Sort lexically (filenames begin with NNNN_).
IFS=$'\n' sorted=( $(printf '%s\n' "${files[@]}" | sort) )
unset IFS

for path in "${sorted[@]}"; do
  fname="$(basename "${path}")"
  applied=$(psql "${DATABASE_URL}" -At -v "fname=${fname}" \
    -c "SELECT 1 FROM _migrations WHERE filename = :'fname' LIMIT 1;")
  if [[ "${applied}" == "1" ]]; then
    echo "skip  ${fname} (already applied)"
    continue
  fi
  echo "apply ${fname}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -q -f "${path}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -q -v "fname=${fname}" \
    -c "INSERT INTO _migrations (filename) VALUES (:'fname');"
done

echo "ok"
