## Description

What does this PR do?

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Refactor (no functional change)
- [ ] Documentation
- [ ] Test improvement
- [ ] Build / CI / tooling
- [ ] Breaking change (specify migration)

## Verification checklist

- [ ] `pnpm -r typecheck` passes
- [ ] `pnpm -r build` passes
- [ ] `pnpm -r test` passes
- [ ] No new secrets committed (env files, keys, tokens)
- [ ] No fake/mock data in production code paths
- [ ] Honest empty states / error messages maintained

## Architecture boundaries (preserve these)

- [ ] `packages/contracts` unchanged
      (changes here require re-audit before merge)
- [ ] `apps/miniapp` unchanged
      (separately published - coordinate before changing)
- [ ] `apps/web/app/base` unchanged
      (Farcaster Frame target - handle with extra care)
- [ ] Safety rings logic unchanged
      (deterministic by design - no LLM intrusion)

## Test coverage

- [ ] Tests added/updated for new logic
- [ ] Test count delta: +X (or 0)
- [ ] No existing tests removed

## Documentation

- [ ] README updated (if user-visible change)
- [ ] CHANGELOG noted (if release-worthy)

## Related issues

Closes #
Related #

## Screenshots (if UI change)

## Notes for reviewer
