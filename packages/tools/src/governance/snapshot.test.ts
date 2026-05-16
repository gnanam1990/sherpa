import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  getProposals,
  getVote,
  getVotesByAddress,
  buildVoteMessage,
  submitVote,
  SNAPSHOT_SPACES,
} from './snapshot.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('Snapshot Integration', () => {
  describe('getProposals', () => {
    test('fetches proposals from snapshot API', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            proposals: [
              {
                id: '0x123',
                title: 'Test Proposal',
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
            ],
          },
        }),
      });

      const proposals = await getProposals('aave.eth');
      expect(proposals).toHaveLength(1);
      expect(proposals[0].id).toBe('0x123');
      expect(proposals[0].title).toBe('Test Proposal');
      expect(proposals[0].state).toBe('active');
    });

    test('returns empty array on empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { proposals: [] } }),
      });

      const proposals = await getProposals('compound.eth');
      expect(proposals).toHaveLength(0);
    });

    test('handles missing data gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      });

      const proposals = await getProposals('optimism.eth');
      expect(proposals).toHaveLength(0);
    });

    test('sends correct GraphQL query', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { proposals: [] } }),
      });

      await getProposals('aave.eth', 'active', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.snapshot.org/graphql',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.space).toBe('aave.eth');
      expect(body.variables.state).toBe('active');
      expect(body.variables.first).toBe(10);
    });

    test('defaults to active state and 20 items', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { proposals: [] } }),
      });

      await getProposals('aave.eth');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.state).toBe('active');
      expect(body.variables.first).toBe(20);
    });
  });

  describe('getVote', () => {
    test('returns vote when found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            votes: [{ id: 'v1', voter: '0xabc', choice: 1, vp: 1000, reason: 'yes', created: 1700000000 }],
          },
        }),
      });

      const vote = await getVote('0x123', '0xabc');
      expect(vote).not.toBeNull();
      expect(vote!.choice).toBe(1);
    });

    test('returns null when no vote found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { votes: [] } }),
      });

      const vote = await getVote('0x123', '0xabc');
      expect(vote).toBeNull();
    });

    test('lowercases voter address', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { votes: [] } }),
      });

      await getVote('0x123', '0xABCDEF');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.voter).toBe('0xabcdef');
    });
  });

  describe('getVotesByAddress', () => {
    test('fetches vote history for address', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          data: {
            votes: [
              { id: 'v1', voter: '0xabc', choice: 1, vp: 1000, reason: '', created: 1700000000 },
              { id: 'v2', voter: '0xabc', choice: 2, vp: 500, reason: 'against', created: 1699900000 },
            ],
          },
        }),
      });

      const votes = await getVotesByAddress('0xabc');
      expect(votes).toHaveLength(2);
    });

    test('returns empty array when no votes', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { votes: [] } }),
      });

      const votes = await getVotesByAddress('0xabc');
      expect(votes).toHaveLength(0);
    });
  });

  describe('buildVoteMessage', () => {
    test('builds correct EIP-712 structure', () => {
      const msg = buildVoteMessage('aave.eth', '0x123', 1);
      expect(msg.domain.name).toBe('snapshot');
      expect(msg.domain.version).toBe('0.1.4');
      expect(msg.value.space).toBe('aave.eth');
      expect(msg.value.proposal).toBe('0x123');
      expect(msg.value.choice).toBe(1);
      expect(msg.value.app).toBe('sherpa');
    });

    test('includes Vote type definition', () => {
      const msg = buildVoteMessage('aave.eth', '0x123', 2);
      expect(msg.types.Vote).toBeDefined();
      expect(msg.types.Vote.length).toBeGreaterThan(0);
    });

    test('supports different choices', () => {
      const msg1 = buildVoteMessage('aave.eth', '0x123', 1);
      const msg2 = buildVoteMessage('aave.eth', '0x123', 2);
      expect(msg1.value.choice).toBe(1);
      expect(msg2.value.choice).toBe(2);
    });
  });

  describe('submitVote', () => {
    test('submits vote to snapshot hub', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-id-123' }),
      });

      const result = await submitVote('0xabc', 'aave.eth', '0x123', 1, '0xsignature', 'supporting');
      expect(result.id).toBe('msg-id-123');
    });

    test('throws on failed submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });

      await expect(submitVote('0xabc', 'aave.eth', '0x123', 1, '0xbad')).rejects.toThrow();
    });

    test('sends correct payload structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-id' }),
      });

      await submitVote('0xabc', 'aave.eth', '0x123', 1, '0xsig', 'test reason');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.address).toBe('0xabc');
      expect(body.data.space).toBe('aave.eth');
      expect(body.data.choice).toBe(1);
      expect(body.data.reason).toBe('test reason');
      expect(body.sig).toBe('0xsig');
    });
  });

  describe('SNAPSHOT_SPACES', () => {
    test('defines aave space', () => {
      expect(SNAPSHOT_SPACES.aave).toBe('aave.eth');
    });

    test('defines compound space', () => {
      expect(SNAPSHOT_SPACES.compound).toBe('compound.eth');
    });

    test('defines optimism space', () => {
      expect(SNAPSHOT_SPACES.optimism).toBe('optimism.eth');
    });
  });
});
