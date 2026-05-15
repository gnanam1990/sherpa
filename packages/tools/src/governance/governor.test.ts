import { describe, test, expect } from 'vitest';
import { listProposals, buildVoteCall, buildDelegateCall } from './governor.js';

describe('Governance module', () => {
  test('listProposals returns mock proposals', async () => {
    const proposals = await listProposals({ chainId: 8453 });
    expect(proposals.length).toBeGreaterThan(0);
  });

  test('buildVoteCall returns valid call', () => {
    const call = buildVoteCall({ proposalId: '1', support: 'yes' });
    expect(call.to).toBeDefined();
    expect(call.value).toBe(0n);
  });

  test('buildDelegateCall returns valid call', () => {
    const call = buildDelegateCall('0x1234');
    expect(call.to).toBeDefined();
    expect(call.value).toBe(0n);
  });
});
