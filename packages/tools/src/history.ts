import type { Address } from '@sherpa/safety';

/**
 * Unified history item. Sourced from Basescan (ERC-20 transfers + internal
 * txs) and the local audit log; merged + deduped by tx hash.
 */
export type HistoryItem = {
  txHash: `0x${string}`;
  timestamp: number;
  direction: 'in' | 'out' | 'self';
  counterparty: Address;
  /** Asset symbol when recognised ("ETH", "USDC") or the contract address. */
  asset: string;
  /** Human-friendly amount ("5.00 USDC", "0.01 ETH"). */
  amountDisplay: string;
  /** Local intent tag if the tx was initiated via Sherpa. */
  sherpaIntent?: string;
};

export interface HistoryIndexer {
  list(address: Address, limit: number): Promise<HistoryItem[]>;
}

/** Empty indexer for local dev / tests. */
export const emptyIndexer: HistoryIndexer = {
  async list() {
    return [];
  },
};
