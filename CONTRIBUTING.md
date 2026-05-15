# Contributing to Sherpa

Thanks for considering a contribution. Sherpa is a natural-language agent for Base.

## Getting Started

1. Fork the repo.
2. Clone and install dependencies with `pnpm install --frozen-lockfile`.
3. Copy the relevant `.env.example` files to local env files.
4. Run tests with `pnpm test`.
5. Run the API and web app with `pnpm --filter @sherpa/api dev` and `pnpm --filter @sherpa/web dev`.

## Architecture

See `docs/sherpa/SHERPA_PRD_V4.md` for product context.
See `docs/sherpa/decisions/` for architecture decisions.

## Domain Ownership

- M1 Backend/Tools: `packages/agentkit`, `packages/core`, `packages/tools`, `packages/safety`, `packages/llm`, `packages/config`
- M2 Frontend: `apps/web`, `apps/miniapp`, `packages/ui`
- M3 API/Infra: `apps/api`, `packages/memory`, `packages/scheduler`, `packages/logger`, `packages/identity`

Cross-domain PRs should call out the affected areas clearly.

## Code Style

- TypeScript strict mode.
- Smart mocks only in tests: verify call shape, never scripted results.
- Avoid `localStorage` and `sessionStorage` for persistent product state.
- Avoid HTML `<form>` tags in the web app.
- Use `z.preprocess` for env var parsing.
- Use `snake_case` for SQL and `camelCase` for TypeScript.

## Tests

- Package tests: `pnpm --filter <package> test`
- Full test suite: `pnpm test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`

New safety-critical behavior should include focused tests.

## Decision Docs

Architectural decisions go in `docs/sherpa/decisions/` using this file name format:

```text
YYYY-MM-DD-<topic-slug>.md
```

## Devlogs

Each shipped priority should get a devlog in `docs/sherpa/devlog/` using the same date-slug format.

## Security

If you find a security issue, do not open a public issue. Follow `SECURITY.md`.

## License

Sherpa is MIT licensed. By contributing, you agree that your contributions are licensed under MIT.
