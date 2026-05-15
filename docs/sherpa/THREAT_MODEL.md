# Sherpa Threat Model

## Assets
- User funds (ETH, ERC-20 tokens)
- User private keys (managed by Coinbase Smart Wallet)
- Session keys (temporary signing authority)
- API keys (developer access)
- Paymaster funds (sponsored gas)

## Threat Actors
1. **External Attacker** — Exploits smart contracts or API
2. **Malicious User** — Abuses session keys or permissions
3. **Compromised Key** — User's wallet key stolen
4. **Insider** — Admin key compromised

## Threats & Mitigations

### T1: Reentrancy Attack
- Risk: Flash loan callback re-enters executor
- Mitigation: Single-transaction flash loans, no external calls during execution

### T2: Signature Spoofing
- Risk: Forged UserOp signatures
- Mitigation: UserOp signature verification before rate limit

### T3: Rate Limit Bypass
- Risk: Exhaust paymaster funds
- Mitigation: Per-sender rate limiting, signature verification pre-check

### T4: Session Key Abuse
- Risk: Session key used beyond intended scope
- Mitigation: Spend limits, duration limits, permission-based access

### T5: Oracle Manipulation
- Risk: Price feed manipulation
- Mitigation: Multiple oracle sources, TWAP, circuit breakers

### T6: Flash Loan Attack
- Risk: Flash loan used to manipulate state
- Mitigation: Flash loan must be repaid in same tx, amount caps

### T7: Liquidation Cascading
- Risk: Mass liquidation causes price crash
- Mitigation: Health factor monitoring, auto-repay, gradual liquidation

## Security Controls
- 7 safety rings before any transaction
- Tenderly simulation on mainnet (fail-closed)
- Per-tx and per-day spend caps
- Rate limiting (in-memory or Postgres)
- UserOp signature verification
- Address allowlisting
- Sanctions list checking (OFAC)
