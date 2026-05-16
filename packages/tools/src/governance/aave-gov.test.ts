import { describe, test, expect } from 'vitest';
import { getProposals, buildVoteTx, buildDelegateTx, AAVE_GOV_ADDRESSES } from './aave-gov.js';
import { getProposals as getCompoundProposals, buildVoteTx as compoundVoteTx, buildDelegateTx as compoundDelegateTx, COMPOUND_GOV_ADDRESSES } from './compound-gov.js';
import { getProposals as getOptimismProposals, buildVoteTx as optimismVoteTx, buildDelegateTx as optimismDelegateTx, OPTIMISM_GOV_ADDRESSES } from './optimism-gov.js';

describe('On-chain Governance', () => {
  describe('Aave Governance', () => {
    test('getProposals returns proposals', async () => {
      const proposals = await getProposals();
      expect(proposals.length).toBeGreaterThan(0);
    });

    test('proposal has required fields', async () => {
      const proposals = await getProposals();
      const p = proposals[0];
      expect(p.id).toBeDefined();
      expect(p.title).toBeDefined();
      expect(p.status).toBeDefined();
      expect(p.proposer).toBeDefined();
    });

    test('buildVoteTx returns valid tx structure', () => {
      const tx = buildVoteTx('42', 'yes');
      expect(tx.to).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(0n);
    });

    test('buildVoteTx supports yes/no/abstain', () => {
      const yesTx = buildVoteTx('1', 'yes');
      const noTx = buildVoteTx('1', 'no');
      const abstainTx = buildVoteTx('1', 'abstain');
      expect(yesTx).toBeDefined();
      expect(noTx).toBeDefined();
      expect(abstainTx).toBeDefined();
    });

    test('buildVoteTx accepts reason', () => {
      const tx = buildVoteTx('1', 'yes', 'I support this proposal');
      expect(tx).toBeDefined();
    });

    test('buildDelegateTx returns valid tx structure', () => {
      const tx = buildDelegateTx('0x1234567890abcdef1234567890abcdef12345678');
      expect(tx.to).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(0n);
    });

    test('GOV_ADDRESSES has correct addresses', () => {
      expect(AAVE_GOV_ADDRESSES.governor).toMatch(/^0x/);
      expect(AAVE_GOV_ADDRESSES.token).toMatch(/^0x/);
    });
  });

  describe('Compound Governance', () => {
    test('getProposals returns proposals', async () => {
      const proposals = await getCompoundProposals();
      expect(proposals.length).toBeGreaterThan(0);
    });

    test('proposal has required fields', async () => {
      const proposals = await getCompoundProposals();
      const p = proposals[0];
      expect(p.id).toBeDefined();
      expect(p.title).toBeDefined();
      expect(p.status).toBeDefined();
    });

    test('buildVoteTx returns valid tx structure', () => {
      const tx = compoundVoteTx('118', 'yes');
      expect(tx.to).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(0n);
    });

    test('buildDelegateTx returns valid tx structure', () => {
      const tx = compoundDelegateTx('0x1234567890abcdef1234567890abcdef12345678');
      expect(tx.to).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(0n);
    });

    test('GOV_ADDRESSES has correct addresses', () => {
      expect(COMPOUND_GOV_ADDRESSES.governor).toMatch(/^0x/);
      expect(COMPOUND_GOV_ADDRESSES.token).toMatch(/^0x/);
    });
  });

  describe('Optimism Governance', () => {
    test('getProposals returns proposals', async () => {
      const proposals = await getOptimismProposals();
      expect(proposals.length).toBeGreaterThan(0);
    });

    test('proposal has required fields', async () => {
      const proposals = await getOptimismProposals();
      const p = proposals[0];
      expect(p.id).toBeDefined();
      expect(p.title).toBeDefined();
      expect(p.status).toBeDefined();
    });

    test('buildVoteTx returns valid tx structure', () => {
      const tx = optimismVoteTx('7', 'no');
      expect(tx.to).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(0n);
    });

    test('buildDelegateTx returns valid tx structure', () => {
      const tx = optimismDelegateTx('0x1234567890abcdef1234567890abcdef12345678');
      expect(tx.to).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(0n);
    });

    test('GOV_ADDRESSES has correct addresses', () => {
      expect(OPTIMISM_GOV_ADDRESSES.governor).toMatch(/^0x/);
      expect(OPTIMISM_GOV_ADDRESSES.token).toMatch(/^0x/);
    });
  });
});
