# Internal Beta

## Purpose

Validate Sherpa with 10-20 trusted users before public launch. Identify UX issues, bugs, and edge cases.

## Timeline

| Phase | Duration | Users |
|---|---|---|
| Invite-only beta | 2 weeks | 10-20 users |
| Open beta | 1 week | 50-100 users |
| Public launch | — | Unlimited |

## Beta User Selection

### Criteria
- Familiar with DeFi (Aave, Uniswap experience)
- Active on Base L2
- Willing to report bugs
- Available for 2-week testing period

### Target Mix
| Role | Count | Purpose |
|---|---|---|
| DeFi power users | 5 | Stress test, edge cases |
| New DeFi users | 5 | UX feedback, onboarding |
| Developers | 3 | API/SDK feedback |
| Community members | 5 | General feedback |

## Onboarding Process

### Step 1: Invite
- Send personalized invite via DM
- Include beta access link
- Include test ETH/tokens if needed

### Step 2: Setup Guide
Share with each beta user:

```
Welcome to Sherpa Beta!

1. Visit: https://sherpa-web.vercel.app
2. Connect your Coinbase Smart Wallet (Base network)
3. Try these commands:
   - "send 0.001 ETH to vitalik.base.eth"
   - "what's my balance"
   - "show my recent transactions"

4. Report bugs: [link to form]
5. Join feedback channel: [link]

Test tokens available on request.
```

### Step 3: Token Distribution
```bash
# Send test USDC to beta users
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" \
  <BETA_USER_ADDRESS> 10000000 \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Bug Reporting Process

### Google Form Template

| Field | Type | Required |
|---|---|---|
| Bug title | Text | Yes |
| Severity | Dropdown (Critical/High/Medium/Low) | Yes |
| Steps to reproduce | Textarea | Yes |
| Expected behavior | Textarea | Yes |
| Actual behavior | Textarea | Yes |
| Transaction hash | Text | No |
| Screenshot | File | No |
| Browser/device | Text | Yes |
| Contact email | Email | Yes |

### Severity Definitions

| Severity | Definition | Response Time |
|---|---|---|
| **Critical** | Funds lost, contract broken | < 2 hours |
| **High** | Feature broken, no workaround | < 24 hours |
| **Medium** | Feature broken, workaround exists | < 48 hours |
| **Low** | Cosmetic, minor UX issue | Next release |

### Bug Triage

Daily during beta:
1. Review new reports
2. Classify severity
3. Assign to team member
4. Update reporter on status

## Feedback Collection

### Structured Feedback (Week 1)

Survey questions:
1. How easy was it to connect your wallet? (1-5)
2. Did the intent parser understand your commands? (1-5)
3. Were transaction confirmations clear? (1-5)
4. How confident did you feel about security? (1-5)
5. What's the #1 feature you'd add?
6. What's the most confusing part?

### Unstructured Feedback

- Weekly feedback call (30 min)
- Open Discord/Telegram channel
- Direct DM access to team

## Metrics to Track

| Metric | Target | Measurement |
|---|---|---|
| Activation rate | > 80% | Users who complete first tx |
| Daily active users | > 50% of beta | Users active per day |
| Transaction success rate | > 95% | Successful tx / attempted tx |
| Error rate | < 5% | Errors / total interactions |
| NPS score | > 40 | Net Promoter Score survey |
| Bug reports | < 10 critical | Count by severity |

## Issue Triage Board

| Column | Definition |
|---|---|
| **Inbox** | New reports, untriaged |
| **Confirmed** | Reproduced, severity assigned |
| **In Progress** | Being fixed |
| **Fixed** | Ready for testing |
| **Verified** | Fix confirmed by reporter |
| **Won't Fix** | Acknowledged, not fixing |

## Beta Exit Criteria

Move to public launch when:
- [ ] Zero critical bugs open
- [ ] Zero high bugs open for > 48 hours
- [ ] Transaction success rate > 95%
- [ ] NPS score > 40
- [ ] All beta users completed feedback survey
- [ ] Smoke tests passing on mainnet
- [ ] Monitoring dashboards configured
- [ ] Support runbook written
