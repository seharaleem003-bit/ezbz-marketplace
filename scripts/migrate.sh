#!/usr/bin/env bash
# Non-interactive migration helper for this Prisma 7 setup.
# `prisma migrate dev` refuses to run non-interactively when it has any
# warning to show (e.g. new unique constraints), which is unusable in an
# automated shell. This generates the SQL diff against the live DB,
# writes it as a normal tracked migration, applies it, and marks it
# resolved — equivalent to what `migrate dev` would have done.
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: scripts/migrate.sh <migration_name>" >&2
  exit 1
fi

NAME="$1"
TS=$(date -u +%Y%m%d%H%M%S)
DIR="prisma/migrations/${TS}_${NAME}"
SQL_FILE="${DIR}/migration.sql"

mkdir -p "$DIR"
npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script > "$SQL_FILE"

if [ ! -s "$SQL_FILE" ]; then
  echo "No schema changes detected — removing empty migration folder."
  rmdir "$DIR"
  exit 0
fi

echo "--- Generated SQL ($SQL_FILE) ---"
cat "$SQL_FILE"
echo "--- Applying ---"

npx prisma db execute --file "$SQL_FILE"
npx prisma migrate resolve --applied "${TS}_${NAME}"
npx prisma generate
echo "Done: ${TS}_${NAME}"
