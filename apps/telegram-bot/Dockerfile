FROM node:26-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY apps/telegram-bot ./apps/telegram-bot
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sherpa/telegram-bot build

CMD ["node", "apps/telegram-bot/dist/index.js"]
