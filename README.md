# Sherpa

The natural-language Base agent — a pnpm + Turborepo monorepo.

This repo is the **Week-1 Day-1 scaffold** described in
[`docs/sherpa/SHERPA_TEAM_BUILD_INDEX.md`](./docs/sherpa/SHERPA_TEAM_BUILD_INDEX.md).
Packages are stubs with stable typed contracts; real implementations land in
later weeks per the per-member build packs.

## Layout

```
apps/
├── web/           Next.js 15 app                (M2)
└── api/           Fastify REST API              (M3)

packages/
├── safety/        Rings 1-7, allowlists         (M1)
├── tools/         Protocol adapters             (M1)
├── core/          Parser, planner, executor     (M1)
├── llm/           openclaude router             (M1)
├── agentkit/      Coinbase AgentKit fallback    (M1)
├── ui/            Design tokens + components    (M2)
├── identity/      Address resolvers             (M3)
├── memory/        Audit log, user prefs         (M3)
├── scheduler/     DCA, alerts, monitors         (M3)
├── config/        Env validation, chain configs (M3)
└── logger/        pino logger facade            (M3)

docs/sherpa/       The build packs (M1/M2/M3) + team index.
```

Ownership is enforced socially, not via CODEOWNERS yet; see each build pack
for the ownership rules (e.g. M1_BACKEND_PACK §2 "You do NOT touch").

## Requirements

- Node.js 20+ (22 recommended; see `.nvmrc`)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9.15.1 --activate`)

## Quick start

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm lint
```

Run the API locally:

```bash
pnpm --filter @sherpa/api dev
# → GET http://localhost:3001/api/health
```

Run the web app locally:

```bash
pnpm --filter @sherpa/web dev
# → http://localhost:3100
```

## Task reference (Turbo)

| Command          | What it does                                                |
| ---------------- | ----------------------------------------------------------- |
| `pnpm build`     | `tsc -b` for each TS package + `next build` for `apps/web`. |
| `pnpm typecheck` | Strict TS check across the workspace (no emit).             |
| `pnpm lint`      | ESLint flat config (v9 + typescript-eslint).                |
| `pnpm test`      | Vitest across all packages.                                 |
| `pnpm format`    | Prettier write.                                             |

## Contracts (Week-1 stable types)

Already exported for M1/M2/M3 to import against:

- `@sherpa/core` → `ConfirmationCardProps`, `ExecutionStep`, `ExecutionPlan`, `ParsedIntent`, `Intent`.
- `@sherpa/identity` → `ResolvedAddress`, `ResolverError`, `resolve()`.
- `@sherpa/memory` → `createAuditLog`, `updateAuditLog`, `getUserHistorySnapshot`.
- `@sherpa/safety` → `Address`, `SafetyRing`, `ALLOWED_CONTRACTS`, `assertAllowlisted`.
- `@sherpa/llm` → `LLMTask`, `LLMRequest`, `LLMResponse`, `LLMProvider`.

## License

UNLICENSED — private repo. Licensing will be decided before public launch.
