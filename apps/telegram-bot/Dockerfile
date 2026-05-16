FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/telegram-bot ./apps/telegram-bot
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sherpa/telegram-bot build

CMD ["node", "apps/telegram-bot/dist/index.js"]
