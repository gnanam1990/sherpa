# Decision: GOVERNANCE Intent (Stage 7 P1)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 7 P1

## Context
Sherpa needs GOVERNANCE intent for on-chain governance participation — voting on proposals, creating proposals, delegating voting power, and listing active proposals.

## Decisions

### Supported Actions
- **vote**: Cast yes/no/abstain on a proposal by ID
- **propose**: Create a new governance proposal with description
- **delegate**: Delegate voting power to an address
- **list**: Browse active proposals

### Parser Patterns
- `vote yes on proposal #1` → `govAction: 'vote', govVote: 'yes', govProposalId: '1'`
- `cast my vote for proposal 5` → `govAction: 'vote', govVote: 'yes'`
- `vote against proposal 3` → `govAction: 'vote', govVote: 'no'`
- `create proposal Increase fee to 0.2%` → `govAction: 'propose'`
- `delegate my votes to 0x1234` → `govAction: 'delegate'`
- `list active proposals` → `govAction: 'list'`

### Vote Mapping
- `for` → `yes`
- `against` → `no`
- `yes`, `no`, `abstain` → pass-through

### Governor Module
- Mock proposal list for V1 (returns hardcoded proposals)
- `buildVoteCall` and `buildDelegateCall` return EIP-5792-compatible call objects
- Governance ABI includes `castVote`, `propose`, `delegate`

## Future Work
- On-chain proposal fetching via governor contract events
- Proposal creation with multi-call batching
- Vote reason/explanation support
- Quorum and voting period validation
