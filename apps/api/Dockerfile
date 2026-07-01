FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# Prisma generate — root'tan çalıştır, schema path açık
RUN pnpm --filter @muteahitt/api exec prisma generate --schema=/app/prisma/schema.prisma

RUN pnpm --filter @muteahitt/shared build

RUN pnpm --filter @muteahitt/api build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
