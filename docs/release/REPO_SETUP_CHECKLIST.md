# Sherpa GitHub repository setup checklist

Use this checklist when configuring the public GitHub repo at the launch moment.

## Pre-flip preparation (already done in Phases 0-4)

- [x] LICENSE present (Apache 2.0)
- [x] NOTICE with maintainer + contracts
- [x] SECURITY.md with security review history
- [x] CONTRIBUTING.md guidelines
- [x] Apache 2.0 headers on source files (298 files)
- [x] README.md presentation-ready
- [x] .github/ISSUE_TEMPLATE/ (3 templates)
- [x] .github/PULL_REQUEST_TEMPLATE.md
- [x] .github/FUNDING.yml (placeholder)
- [x] .gitignore hardened

## Launch day sequence

### Step 1: Push all commits

```bash
cd /home/gnanasekaran/dev/serpha/sherpa
git status
git log --oneline -15
git push origin main
```

Expected:

- Working tree is clean.
- `main` includes all open-source preparation commits.
- GitHub default branch reflects the same commit as local `main`.

### Step 2: Push the release tag

Only do this after Phase 5 creates the local `v0.5.0` annotated tag.

```bash
git show v0.5.0 --no-patch
git push origin v0.5.0
```

Expected:

- Tag points to the final verified open-source release commit.
- Tag is visible at `github.com/gnanam1990/sherpa/releases`.

### Step 3: Change repository visibility

In GitHub:

1. Open `github.com/gnanam1990/sherpa`.
2. Go to Settings.
3. Scroll to Danger Zone.
4. Change repository visibility from Private to Public.
5. Confirm the repository name when GitHub asks.

Expected:

- Repository is publicly visible.
- README renders on the public repository homepage.
- LICENSE is detected as Apache License 2.0.

### Step 4: Create the v0.5.0 GitHub release

1. Open Releases.
2. Click Draft a new release.
3. Choose tag `v0.5.0`.
4. Title: `Sherpa v0.5.0 - first open source release`
5. Paste the contents of `docs/release/RELEASE_NOTES_v0.5.0.md`.
6. Publish release.

Expected:

- Release page links to the exact `v0.5.0` tag.
- Verified contracts, security review status, and known limitations are visible.

## Repository settings

- [ ] Description:
      `Natural-language DeFi agent for Base. Independently reviewed. Multi-chain portfolio. Open source. Solo built.`
- [ ] Website: `https://sherpa-miniapp.vercel.app`
- [ ] Topics:
      `defi`, `base`, `base-chain`, `aave`, `ethereum`, `natural-language`,
      `ai-agent`, `security-review`, `open-source`, `typescript`, `nextjs`,
      `viem`, `wagmi`, `smart-contracts`

## Branch protection (main branch)

- [ ] Require pull request reviews before merging
- [ ] Require status checks before merging
- [ ] Required checks: typecheck, tests, build
- [ ] Require branches to be up to date before merging
- [ ] Require linear history for future PRs
- [ ] Prevent force pushes
- [ ] Restrict branch deletions
- [ ] Require conversation resolution before merging

## Security

- [ ] Enable Dependency graph
- [ ] Enable Dependabot alerts
- [ ] Enable Dependabot security updates
- [ ] Enable Secret scanning
- [ ] Enable Push protection
- [ ] Enable Code scanning
- [ ] Enable default CodeQL setup for JavaScript/TypeScript
- [ ] Confirm `.github/workflows/slither.yml` is enabled for contract scanning

## Discussions

- [ ] Enable GitHub Discussions
- [ ] Categories: General, Q&A, Show and tell, Ideas

## Wiki

- [ ] Disable wiki
- [ ] Use `/docs` in the repository as the source of truth

## Issues

- [ ] Enable issues
- [ ] Confirm Bug report template appears
- [ ] Confirm Feature request template appears
- [ ] Confirm Security concern template appears

## Pull requests

- [ ] Confirm `.github/PULL_REQUEST_TEMPLATE.md` pre-fills new PRs
- [ ] Confirm PR template asks for tests, boundaries, and safety-ring status

## Pages

- [ ] Defer public docs site for now
- [ ] Future source: GitHub Actions deploying from `/docs` or a dedicated docs app

## Releases

- [ ] Create `v0.5.0` release from `docs/release/RELEASE_NOTES_v0.5.0.md`
- [ ] Mark release as latest
- [ ] Do not mark as prerelease unless launch strategy changes

## Sponsors

- [ ] Defer for now
- [ ] Leave `.github/FUNDING.yml` as placeholder until funding links are real

## Visibility

- [ ] Change from private to public as the last launch-day repository setting
- [ ] Confirm public status from a logged-out browser window
- [ ] Confirm public clone works:

```bash
tmpdir="$(mktemp -d)"
git clone https://github.com/gnanam1990/sherpa.git "$tmpdir/sherpa-public-check"
```

## Post-flip verification

- [ ] README renders correctly on GitHub
- [ ] License detected as Apache License 2.0
- [ ] Issue templates appear when opening a new issue
- [ ] PR template appears when opening a new PR
- [ ] Release notes visible under Releases
- [ ] Contract links open on Basescan
- [ ] Mini App link opens
- [ ] Farcaster profile link opens
- [ ] X profile link opens
- [ ] No private env files appear in the public file tree

## Post-launch distribution

- [ ] Add public repo URL to Talent.app Sherpa project entry
- [ ] Add release URL to Talent.app activity/update if supported
- [ ] Cast launch thread on Farcaster
- [ ] Post in Base builder channels
- [ ] Share Mini App and GitHub links together

## Rollback notes

If a sensitive file is discovered after the public flip:

1. Do not delete the file only in a new commit and assume it is gone.
2. Immediately rotate the exposed credential.
3. Open a private incident note.
4. Rewrite history only after understanding the blast radius.
5. Coordinate with GitHub support if cached public data needs removal.
