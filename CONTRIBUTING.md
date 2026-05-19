# Contributing to Sherpa

Sherpa is solo-built and openly maintained. Contributions are welcome when they
align with the project's safety-first principles.

## Before Contributing

- Open an issue first for non-trivial changes.
- Run tests locally: `pnpm test`.
- Run typecheck: `pnpm -r typecheck`.
- All changes require PR review by the maintainer.

## What We Welcome

- Bug fixes with reproducible test cases.
- Documentation improvements.
- Translations and accessibility improvements.
- Additional safety checks that never weaken existing ones.
- Performance optimizations with benchmarks.
- Test coverage improvements.

## What We Do Not Merge

- Changes that bypass safety rings.
- Changes that introduce fake or mock data in production code paths.
- Speculative features without clear user value.
- Breaking changes to audited contracts.
- Changes that reduce test coverage.

## Code Style

- Strict TypeScript; avoid `any` and do not use `@ts-ignore`.
- Tests are required for new logic.
- Use honest empty states and error messages.
- Prefer real data over placeholder data.
- Use `snake_case` for SQL and `camelCase` for TypeScript.

## Architecture Boundaries

Preserve these boundaries:

- `packages/contracts` requires re-audit if changed.
- `apps/miniapp` is independently published; coordinate before changing.
- `apps/web/app/base` is the Farcaster Frame target; handle carefully.
- Safety rings logic is intentionally deterministic; no LLM intrusion.

## Tests

- Package tests: `pnpm --filter <package> test`
- Full test suite: `pnpm test`
- Typecheck: `pnpm -r typecheck`
- Build: `pnpm -r build`

New safety-critical behavior should include focused tests.

## Decision Docs

Architectural decisions go in `docs/sherpa/decisions/` using this filename
format:

```text
YYYY-MM-DD-<topic-slug>.md
```

## Security

If you find a security issue, do not open a public issue. Follow
`SECURITY.md`.

## License

By contributing, you agree your contributions are licensed under Apache 2.0,
the same as the project.

## Recognition

Contributors will be credited in release notes and the `CONTRIBUTORS` file when
one is created.
