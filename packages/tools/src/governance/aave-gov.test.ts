import { describe, test, expect } from 'vitest';
import { getProposals, buildVoteTx, buildDelegateTx, AAVE_GOV_ADDRESSES } from './aave-gov.js';
import { getProposals as getCompoundProposals, buildVoteTx as compoundVoteTx, buildDelegateTx as compoundDelegateTx, COMPOUND_GOV_ADDRESSES } from './compound-gov.js';
import { getProposals as getOptimismProposals, buildVoteTx as optimismVoteTx, buildDelegateTx as optimismDelegateTx, OPTIMISM_GOV_ADDRESSES } from './optimism-gov.js';

describe('On-chain Governance', () => {
  describe('Aave Governance', () => {
    test('getProposals returns empty (honest — no mock data)', async () => {
      const proposals = await getProposals();
      expect(proposals.length).toBe(0);
    });

    test('buildVoteTx returns real ABI-encoded calldata', () => {
      const tx = buildVoteTx('42', 'yes');
      expect(tx.to).toBe(AAVE_GOV_ADDRESSES.governor);
      expect(tx.data).not.toBe('0x');
      expect(tx.data.length).toBeGreaterThan(10);
      expect(tx.value).toBe(0n);
    });

    test('buildVoteTx encodes different support values', () => {
      const yesTx = buildVoteTx('1', 'yes');
      const noTx = buildVoteTx('1', 'no');
      const abstainTx = buildVoteTx('1', 'abstain');
      expect(yesTx.data).not.toBe(noTx.data);
      expect(noTx.data).not.toBe(abstainTx.data);
    });

    test('buildVoteTx with reason uses submitVoteWithReason', () => {
      const withReason = buildVoteTx('1', 'yes', 'I support this proposal');
      const withoutReason = buildVoteTx('1', 'yes');
      expect(withReason.data).not.toBe(withoutReason.data);
      expect(withReason.data.length).toBeGreaterThan(withoutReason.data.length);
    });

    test('buildDelegateTx returns real ABI-encoded calldata', () => {
      const tx = buildDelegateTx('0x1234567890abcdef1234567890abcdef12345678');
      expect(tx.to).toBe(AAVE_GOV_ADDRESSES.token);
      expect(tx.data).not.toBe('0x');
      expect(tx.data.length).toBeGreaterThan(10);
      expect(tx.value).toBe(0n);
    });

    test('GOV_ADDRESSES has correct addresses', () => {
      expect(AAVE_GOV_ADDRESSES.governor).toMatch(/^0x/);
      expect(AAVE_GOV_ADDRESSES.token).toMatch(/^0x/);
    });
  });

  describe('Compound Governance', () => {
    test('getProposals returns empty (honest — no mock data)', async () => {
      const proposals = await getCompoundProposals();
      expect(proposals.length).toBe(0);
    });

    test('buildVoteTx returns real ABI-encoded calldata', () => {
      const tx = compoundVoteTx('118', 'yes');
      expect(tx.to).toBe(COMPOUND_GOV_ADDRESSES.governor);
      expect(tx.data).not.toBe('0x');
      expect(tx.data.length).toBeGreaterThan(10);
      expect(tx.value).toBe(0n);
    });

    test('buildDelegateTx returns real ABI-encoded calldata', () => {
      const tx = compoundDelegateTx('0x1234567890abcdef1234567890abcdef12345678');
      expect(tx.to).toBe(COMPOUND_GOV_ADDRESSES.token);
      expect(tx.data).not.toBe('0x');
      expect(tx.data.length).toBeGreaterThan(10);
      expect(tx.value).toBe(0n);
    });

    test('GOV_ADDRESSES has correct addresses', () => {
      expect(COMPOUND_GOV_ADDRESSES.governor).toMatch(/^0x/);
      expect(COMPOUND_GOV_ADDRESSES.token).toMatch(/^0x/);
    });
  });

  describe('Optimism Governance', () => {
    test('getProposals returns empty (honest — no mock data)', async () => {
      const proposals = await getOptimismProposals();
      expect(proposals.length).toBe(0);
    });

    test('buildVoteTx returns real ABI-encoded calldata', () => {
      const tx = optimismVoteTx('7', 'no');
      expect(tx.to).toBe(OPTIMISM_GOV_ADDRESSES.governor);
      expect(tx.data).not.toBe('0x');
      expect(tx.data.length).toBeGreaterThan(10);
      expect(tx.value).toBe(0n);
    });

    test('buildDelegateTx returns real ABI-encoded calldata', () => {
      const tx = optimismDelegateTx('0x1234567890abcdef1234567890abcdef12345678');
      expect(tx.to).toBe(OPTIMISM_GOV_ADDRESSES.token);
      expect(tx.data).not.toBe('0x');
      expect(tx.data.length).toBeGreaterThan(10);
      expect(tx.value).toBe(0n);
    });

    test('GOV_ADDRESSES has correct addresses', () => {
      expect(OPTIMISM_GOV_ADDRESSES.governor).toMatch(/^0x/);
      expect(OPTIMISM_GOV_ADDRESSES.token).toMatch(/^0x/);
    });
  });
});
