FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @sherpa/api... build

EXPOSE 3001

CMD ["pnpm", "--filter", "@sherpa/api", "start"]
