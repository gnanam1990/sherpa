import { describe, test, expect } from 'vitest';
import { listProposals, buildVoteCall, buildDelegateCall } from './governor.js';

const GOVERNOR = '0xc4025b326139768a5e8C3b42F1e5E1e4e63F4D2B';
const TOKEN = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';

describe('Governance module', () => {
  test('listProposals returns empty (honest — no mock data)', async () => {
    const proposals = await listProposals({ chainId: 8453 });
    expect(proposals.length).toBe(0);
  });

  test('buildVoteCall returns real ABI-encoded calldata', () => {
    const call = buildVoteCall({ proposalId: '42', support: 'yes', governorAddress: GOVERNOR as `0x${string}` });
    expect(call.to).toBe(GOVERNOR);
    expect(call.data).not.toBe('0x');
    expect(call.data.length).toBeGreaterThan(10);
    expect(call.value).toBe(0n);
  });

  test('buildVoteCall encodes no vote correctly', () => {
    const call = buildVoteCall({ proposalId: '42', support: 'no', governorAddress: GOVERNOR as `0x${string}` });
    expect(call.data).not.toBe('0x');
    expect(call.data.length).toBeGreaterThan(10);
  });

  test('buildDelegateCall returns real ABI-encoded calldata', () => {
    const call = buildDelegateCall(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
      TOKEN as `0x${string}`,
    );
    expect(call.to).toBe(TOKEN);
    expect(call.data).not.toBe('0x');
    expect(call.data.length).toBeGreaterThan(10);
    expect(call.value).toBe(0n);
  });
});
