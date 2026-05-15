# Decision: Security Hardening (Stage 8 P1)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 8 P1

## Context
Sherpa needs SECURITY intent for multi-sig wallet management, hardware wallet pairing, address whitelisting, and security status checks.

## Decisions

### Supported Actions
- **multisig**: Create/manage multi-sig wallets (via `setup multisig wallet`)
- **hardware**: Connect hardware wallets like Ledger/Trezor (via `connect ledger wallet`)
- **status**: Check security settings and status (via `check my security status`)
- **whitelist**: Add addresses to trusted whitelist (via `add 0x... to my whitelist`)

### Parser Patterns
- `setup multisig wallet` → `securityAction: 'multisig'`
- `connect ledger wallet` → `securityAction: 'hardware'`
- `check my security status` → `securityAction: 'status'`
- `add 0x1234 to my whitelist` → `securityAction: 'whitelist'`, `securityTarget: '0x1234'`

### Multi-sig Module
- `createMultisig(config)` — deploys a multi-sig wallet, returns address and txHash
- `getMultisigTransactions(address)` — lists pending/confirmed/executed transactions
- `buildSubmitCall(to, value, data)` — encodes a submitTransaction call

### Types
- `MultisigConfig` — threshold, signers[], chainId
- `MultisigTransaction` — id, to, value, data, confirmations[], status, createdAt
- `HardwareWalletInfo` — type, address, derivationPath, connected
- `SecurityDeps` — chainId

### Security Considerations
- Multi-sig creation is stubbed for V1 (returns zero address)
- Hardware wallet connection is stubbed for V1
- Whitelist is client-side only for V1; future: on-chain whitelist contract
- All security actions require user confirmation before execution

## Future Work
- Real multi-sig deployment via Safe{Wallet} SDK
- Hardware wallet integration via WalletConnect or direct USB
- On-chain whitelist contract with time-locked removal
- Security audit logging and anomaly detection
