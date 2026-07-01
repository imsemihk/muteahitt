FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# schema.prisma monorepo kökünde olduğu için path açıkça belirtiliyor
RUN cd apps/api && pnpm exec prisma generate --schema=../../prisma/schema.prisma

RUN pnpm --filter @muteahitt/shared build

RUN pnpm --filter @muteahitt/api build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
