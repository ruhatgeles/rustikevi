#!/bin/sh
set -e

# Eski (root ile oluşmuş) upload volume'larının sahipliğini düzelt, sonra yetkisiz kullanıcıya geç
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/packages/api/uploads 2>/dev/null || true
  exec su-exec node "$0" "$@"
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "▶ Migration'lar çalıştırılıyor..."
  node dist/db/migrate.js
  echo "▶ İlk admin kontrolü..."
  node dist/db/seed.js --admin-only
fi

exec "$@"
