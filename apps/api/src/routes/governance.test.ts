import { describe, test, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { governanceRoutes } from './governance.js';

vi.mock('@sherpa/tools', () => ({
  snapshot: {
    getProposals: vi.fn().mockResolvedValue([
      {
        id: '0x123',
        title: 'Snapshot Proposal',
        body: 'Description',
        choices: ['For', 'Against', 'Abstain'],
        start: 1700000000,
        end: 1700100000,
        state: 'active',
        author: '0xabc',
        space: { id: 'aave.eth', name: 'Aave' },
        scores: [100, 50, 10],
        scores_total: 160,
        quorum: 100,
        link: 'https://snapshot.org',
      },
    ]),
    getVote: vi.fn().mockResolvedValue(null),
    getVotesByAddress: vi.fn().mockResolvedValue([]),
    buildVoteMessage: vi.fn().mockReturnValue({
      domain: { name: 'snapshot', version: '0.1.4' },
      types: { Vote: [] },
      value: { space: 'aave.eth', proposal: '0x123', choice: 1, app: 'sherpa' },
    }),
    submitVote: vi.fn().mockResolvedValue({ id: 'msg-id' }),
    SNAPSHOT_SPACES: { aave: 'aave.eth', compound: 'compound.eth', optimism: 'optimism.eth' },
  },
  aaveGov: {
    getProposals: vi.fn().mockResolvedValue([
      { id: '42', title: 'Aave Proposal', status: 'active', proposer: '0xabc', votesFor: '100', votesAgainst: '50', votesAbstain: '10', quorum: '80', startTime: Date.now(), endTime: Date.now() + 86400000 },
    ]),
    buildVoteTx: vi.fn().mockReturnValue({ to: '0xabc', data: '0x', value: 0n }),
    buildDelegateTx: vi.fn().mockReturnValue({ to: '0xabc', data: '0x', value: 0n }),
  },
  compoundGov: {
    getProposals: vi.fn().mockResolvedValue([
      { id: '118', title: 'Compound Proposal', status: 'active', proposer: '0xdef', votesFor: '200', votesAgainst: '30', votesAbstain: '20', quorum: '100', startTime: Date.now(), endTime: Date.now() + 86400000 },
    ]),
    buildVoteTx: vi.fn().mockReturnValue({ to: '0xdef', data: '0x', value: 0n }),
    buildDelegateTx: vi.fn().mockReturnValue({ to: '0xdef', data: '0x', value: 0n }),
  },
  optimismGov: {
    getProposals: vi.fn().mockResolvedValue([
      { id: '7', title: 'Optimism Proposal', status: 'active', proposer: '0xghi', votesFor: '300', votesAgainst: '40', votesAbstain: '30', quorum: '150', startTime: Date.now(), endTime: Date.now() + 86400000 },
    ]),
    buildVoteTx: vi.fn().mockReturnValue({ to: '0xghi', data: '0x', value: 0n }),
    buildDelegateTx: vi.fn().mockReturnValue({ to: '0xghi', data: '0x', value: 0n }),
  },
  delegation: {
    delegate: vi.fn().mockReturnValue({ to: '0xabc', data: '0x', value: '0', protocol: 'aave', delegator: '0x123', delegatee: '0x456' }),
    getDelegation: vi.fn().mockResolvedValue({ protocol: 'aave', delegatee: null, active: false }),
    revokeDelegation: vi.fn().mockReturnValue({ to: '0xabc', data: '0x', value: '0', protocol: 'aave', delegator: '0x123', delegatee: '0x123' }),
  },
}));

describe('Governance API Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await governanceRoutes(app);
  });

  describe('GET /api/governance/proposals', () => {
    test('returns proposals from all sources', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/governance/proposals' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.proposals.length).toBeGreaterThan(0);
    });

    test('filters by source', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/governance/proposals?source=snapshot' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.proposals.every((p: Record<string, unknown>) => p.source === 'snapshot')).toBe(true);
    });

    test('filters by aave source', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/governance/proposals?source=aave' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.proposals.every((p: Record<string, unknown>) => p.source === 'aave')).toBe(true);
    });
  });

  describe('POST /api/governance/proposals', () => {
    test('stores a draft proposal instead of submitting on-chain', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/proposals',
        payload: {
          proposerAddress: '0x1234567890abcdef1234567890abcdef12345678',
          title: 'Add Sherpa delegate policy',
          description: 'Draft a proposal before sending it through the official governance UI.',
          actions: [{
            target: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            value: '0',
            signature: 'setDelegate(address)',
            calldata: '0x',
          }],
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.proposal.id).toMatch(/^draft_/);
      expect(body.proposal.executionEnabled).toBe(false);
      expect(body.warning).toContain('Draft saved only');

      const lookup = await app.inject({
        method: 'GET',
        url: `/api/governance/proposals/${body.proposal.id}`,
      });
      expect(lookup.statusCode).toBe(200);
      expect(JSON.parse(lookup.payload).source).toBe('draft');
    });
  });

  describe('GET /api/governance/proposals/:id', () => {
    test('returns proposal by id', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/governance/proposals/42' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe('42');
    });

    test('returns 404 for unknown proposal', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/governance/proposals/99999' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/governance/vote', () => {
    test('validates vote body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/vote',
        payload: { proposalId: '42', voterAddress: '0x1234567890abcdef1234567890abcdef12345678', support: 'yes' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    test('rejects invalid voter address', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/vote',
        payload: { proposalId: '42', voterAddress: 'invalid', support: 'yes' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('rejects invalid support value', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/vote',
        payload: { proposalId: '42', voterAddress: '0x1234567890abcdef1234567890abcdef12345678', support: 'maybe' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('handles snapshot vote type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/vote',
        payload: { proposalId: '0x123', voterAddress: '0x1234567890abcdef1234567890abcdef12345678', support: 'yes', source: 'snapshot' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.type).toBe('eip712');
    });

    test('handles on-chain vote type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/vote',
        payload: { proposalId: '42', voterAddress: '0x1234567890abcdef1234567890abcdef12345678', support: 'yes', source: 'aave' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.type).toBe('transaction');
    });
  });

  describe('POST /api/governance/delegate', () => {
    test('validates delegate body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/delegate',
        payload: {
          delegatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
          delegateeAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          protocol: 'aave',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    test('rejects invalid protocol', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/delegate',
        payload: {
          delegatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
          delegateeAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          protocol: 'uniswap',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/governance/delegations/:address', () => {
    test('returns delegation statuses', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/governance/delegations/0x1234567890abcdef1234567890abcdef12345678',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.delegations).toBeDefined();
      expect(body.delegations).toHaveLength(3);
    });
  });

  describe('POST /api/governance/delegate/revoke', () => {
    test('revokes delegation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/governance/delegate/revoke',
        payload: {
          delegatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
          protocol: 'aave',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/governance/spaces', () => {
    test('returns snapshot spaces', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/governance/spaces' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.spaces.aave).toBe('aave.eth');
    });
  });
});
