#!/bin/sh
set -e

SCHEMA="/app/apps/web/prisma/schema.prisma"
if [ -f "$SCHEMA" ]; then
  echo "[web] Running Prisma migrate deploy..."
  cd /app/apps/web
  if [ -x "./node_modules/.bin/prisma" ]; then
    ./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma
  else
    npx --yes prisma@6 migrate deploy --schema ./prisma/schema.prisma
  fi
  cd /app
fi

echo "[web] Starting Next.js..."
exec "$@"
