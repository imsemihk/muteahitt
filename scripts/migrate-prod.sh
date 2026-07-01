#!/bin/bash
# Production migration — Railway deploy hook veya CI'dan çalıştırılır
# Kullanım: DATABASE_URL=<neon-url> ./scripts/migrate-prod.sh

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "HATA: DATABASE_URL set edilmemiş"
  exit 1
fi

echo "▶ Prisma migrate deploy çalışıyor..."
pnpm --filter @muteahitt/api exec prisma migrate deploy

echo "▶ Prisma generate çalışıyor..."
pnpm --filter @muteahitt/api exec prisma generate

echo "✓ Migration tamamlandı"
