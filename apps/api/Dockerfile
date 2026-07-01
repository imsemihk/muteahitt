FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Tüm kaynak kodu kopyala
COPY . .

# Bağımlılıkları yükle (scripts dahil — prisma generate için gerekli)
RUN pnpm install --frozen-lockfile

# Shared paketi build et
RUN pnpm --filter @muteahitt/shared build

# API'yi build et
RUN pnpm --filter @muteahitt/api build

# Prisma client oluştur
RUN pnpm --filter @muteahitt/api exec prisma generate

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
