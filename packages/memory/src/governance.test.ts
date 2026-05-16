import { describe, test, expect, beforeEach } from 'vitest';
import { InMemoryGovernanceStore } from './governance.js';
import type { CachedProposal, VoteRecord, DelegationRecord } from './governance.js';

describe('Governance Memory Store', () => {
  let store: InMemoryGovernanceStore;

  beforeEach(() => {
    store = new InMemoryGovernanceStore();
  });

  describe('cacheProposals', () => {
    test('caches proposals', async () => {
      const proposal: CachedProposal = {
        id: '1',
        source: 'snapshot',
        externalId: '0x123',
        title: 'Test Proposal',
        status: 'active',
        cachedAt: new Date(),
      };
      await store.cacheProposals([proposal]);
      const cached = await store.getCachedProposals();
      expect(cached).toHaveLength(1);
      expect(cached[0].title).toBe('Test Proposal');
    });

    test('deduplicates by source:externalId', async () => {
      const p1: CachedProposal = { id: '1', source: 'snapshot', externalId: '0x123', title: 'Old', status: 'active', cachedAt: new Date() };
      const p2: CachedProposal = { id: '1', source: 'snapshot', externalId: '0x123', title: 'New', status: 'active', cachedAt: new Date() };
      await store.cacheProposals([p1]);
      await store.cacheProposals([p2]);
      const cached = await store.getCachedProposals();
      expect(cached).toHaveLength(1);
      expect(cached[0].title).toBe('New');
    });

    test('filters by source', async () => {
      await store.cacheProposals([
        { id: '1', source: 'snapshot', externalId: 'a', title: 'A', status: 'active', cachedAt: new Date() },
        { id: '2', source: 'aave', externalId: 'b', title: 'B', status: 'active', cachedAt: new Date() },
      ]);
      const snapshotOnly = await store.getCachedProposals('snapshot');
      expect(snapshotOnly).toHaveLength(1);
    });

    test('filters by status', async () => {
      await store.cacheProposals([
        { id: '1', source: 'snapshot', externalId: 'a', title: 'A', status: 'active', cachedAt: new Date() },
        { id: '2', source: 'snapshot', externalId: 'b', title: 'B', status: 'closed', cachedAt: new Date() },
      ]);
      const active = await store.getCachedProposals(undefined, 'active');
      expect(active).toHaveLength(1);
    });
  });

  describe('recordVote', () => {
    test('records a vote', async () => {
      const vote: VoteRecord = {
        id: 'v1',
        userAddress: '0xabc',
        source: 'snapshot',
        proposalExternalId: '0x123',
        choice: 'yes',
        votedAt: new Date(),
      };
      const result = await store.recordVote(vote);
      expect(result.choice).toBe('yes');
    });

    test('deduplicates vote by user+source+proposal', async () => {
      const v1: VoteRecord = { id: 'v1', userAddress: '0xabc', source: 'snapshot', proposalExternalId: '0x123', choice: 'yes', votedAt: new Date() };
      const v2: VoteRecord = { id: 'v1', userAddress: '0xabc', source: 'snapshot', proposalExternalId: '0x123', choice: 'no', votedAt: new Date() };
      await store.recordVote(v1);
      await store.recordVote(v2);
      const history = await store.getVoteHistory('0xabc');
      expect(history).toHaveLength(1);
      expect(history[0].choice).toBe('no');
    });

    test('returns vote history for user', async () => {
      await store.recordVote({ id: 'v1', userAddress: '0xabc', source: 'snapshot', proposalExternalId: 'a', choice: 'yes', votedAt: new Date() });
      await store.recordVote({ id: 'v2', userAddress: '0xabc', source: 'aave', proposalExternalId: 'b', choice: 'no', votedAt: new Date() });
      await store.recordVote({ id: 'v3', userAddress: '0xdef', source: 'snapshot', proposalExternalId: 'c', choice: 'abstain', votedAt: new Date() });
      const history = await store.getVoteHistory('0xabc');
      expect(history).toHaveLength(2);
    });
  });

  describe('delegations', () => {
    test('records a delegation', async () => {
      const delegation: DelegationRecord = {
        id: 'd1',
        delegatorAddress: '0xabc',
        delegateeAddress: '0xdef',
        protocol: 'aave',
        chainId: 1,
        active: true,
        delegatedAt: new Date(),
      };
      const result = await store.recordDelegation(delegation);
      expect(result.protocol).toBe('aave');
    });

    test('returns active delegations', async () => {
      await store.recordDelegation({ id: 'd1', delegatorAddress: '0xabc', delegateeAddress: '0xdef', protocol: 'aave', chainId: 1, active: true, delegatedAt: new Date() });
      await store.recordDelegation({ id: 'd2', delegatorAddress: '0xabc', delegateeAddress: '0xdef', protocol: 'compound', chainId: 1, active: true, delegatedAt: new Date() });
      const delegations = await store.getDelegations('0xabc');
      expect(delegations).toHaveLength(2);
    });

    test('revokes delegation', async () => {
      await store.recordDelegation({ id: 'd1', delegatorAddress: '0xabc', delegateeAddress: '0xdef', protocol: 'aave', chainId: 1, active: true, delegatedAt: new Date() });
      await store.revokeDelegation('0xabc', 'aave');
      const delegations = await store.getDelegations('0xabc');
      expect(delegations).toHaveLength(0);
    });

    test('does not return revoked delegations', async () => {
      await store.recordDelegation({ id: 'd1', delegatorAddress: '0xabc', delegateeAddress: '0xdef', protocol: 'aave', chainId: 1, active: true, delegatedAt: new Date() });
      await store.recordDelegation({ id: 'd2', delegatorAddress: '0xabc', delegateeAddress: '0xdef', protocol: 'compound', chainId: 1, active: true, delegatedAt: new Date() });
      await store.revokeDelegation('0xabc', 'aave');
      const delegations = await store.getDelegations('0xabc');
      expect(delegations).toHaveLength(1);
      expect(delegations[0].protocol).toBe('compound');
    });
  });
});
