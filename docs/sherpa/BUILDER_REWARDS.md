# Base Builder Rewards Readiness

How Sherpa qualifies for the [Base Builder program](https://www.base.org/builders)
(builder code `bc_97ju6eu2`), and exactly what is already done in code versus what
must be configured operationally before the Base.dev dashboard leaves 0.

Attribution is plumbed through three independent layers, all pinned to the same
canonical builder code:

| Layer | Where | Mechanism |
|---|---|---|
| On-chain contract | `packages/contracts/src/SherpaRouter.sol` | `bytes32 public constant BUILDER_CODE = "bc_97ju6eu2"`, emitted in `SwapExecuted` / `SupplyExecuted` / `WithdrawExecuted` / `BorrowExecuted` / `RepayExecuted` |
| Web client | `apps/web/lib/wagmi.ts` | ERC-8021 `dataSuffix` (`ox/erc8021`) appended to mainnet sends via `useSherpaSendCalls` → `withSherpaSendCapabilities`; `DEFAULT_BUILDER_CODE` / `resolveBuilderCode()` fall back to `bc_97ju6eu2` |
| Mini App | `apps/miniapp/lib/builder.ts` | builder `dataSuffix` from `NEXT_PUBLIC_BUILDER_CODE`, defaulting to `bc_97ju6eu2` |

## Already correct in code — do not redo

- [x] **On-chain attribution.** `BUILDER_CODE` is a compile-time constant in the
  bytecode. The mainnet router (`0x00bfef87DD352D48F8572BcfA52E57870B35DE8b`) is
  `verified: true`, so the deployed contract provably carries `bc_97ju6eu2`.
  Recorded in `deployments/base-mainnet.json` → `postDeployChecks.builderCode`.
- [x] **Client attribution defaults on.** With `NEXT_PUBLIC_BUILDER_CODE` unset,
  the web and Mini App still attribute to `bc_97ju6eu2` (PR #78). An explicit
  empty value disables it; an explicit code overrides it.
- [x] **Manifest supports ownership.** `apps/miniapp/app/.well-known/farcaster.json`
  emits `baseBuilder.ownerAddress` — but only when the env below is set.

## Operational steps that gate payout — these move the dashboard

These are not code changes; they are account/deploy actions. Until all are done,
attributed mainnet volume stays at 0.

- [ ] **Claim the builder code.** In the Base.dev dashboard, claim `bc_97ju6eu2`
  to your payout wallet.
- [ ] **Verify identity on Talent Protocol.** The payout wallet needs a Basename,
  a connected GitHub, and a Builder Score. It must be the **same** wallet that
  claimed the code and that the manifest advertises (below).
- [ ] **Set `BASE_BUILDER_OWNER_ADDRESS`** (production, `apps/miniapp`) to that
  payout wallet. Without it, `baseBuilder` is dropped from the manifest entirely
  and Base cannot tie the Mini App to your wallet. See `STAGE_3_DEPLOY.md` §C.
- [ ] **Set the Farcaster account association** (`FARCASTER_HEADER` /
  `FARCASTER_PAYLOAD` / `FARCASTER_SIGNATURE`) so the Mini App is published and
  verifiable. See `STAGE_3_DEPLOY.md` §D–E.
- [ ] **Drive real mainnet transactions** through the live router so attributed
  volume is non-zero. This is also the only true end-to-end test that the
  `dataSuffix` is accepted and indexed.

## Verify attribution end-to-end

After driving a mainnet send:

1. Open the tx on [basescan.org](https://basescan.org) → confirm a `SwapExecuted`
   (or supply/withdraw/borrow/repay) event with `builderCode = bc_97ju6eu2`.
2. Confirm the calldata carries the ERC-8021 builder `dataSuffix`.
3. Check the Base.dev dashboard → Number of Transactions / Daily Transacting
   Users increment for `bc_97ju6eu2`.

## Notes

- Deploy artifacts use different schemas by vintage: `base-sepolia.json` records
  `post_deploy_checks.builder_code` (snake_case); `base-mainnet.json` records
  `postDeployChecks.builderCode` (camelCase). Both now document the same code.
- The DB-level `builder_code` columns (`packages/memory/*`) and the scheduler's
  `BUILDER_CODE = 'sherpa-dca-v1'` are internal app records, distinct from the
  Base Builder attribution code.
