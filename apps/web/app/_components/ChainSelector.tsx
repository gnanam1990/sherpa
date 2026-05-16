'use client';

import { useState } from 'react';

export type Chain = {
  id: number;
  name: string;
  shortName: string;
  icon?: string;
};

const SUPPORTED_CHAINS: Chain[] = [
  { id: 8453, name: 'Base', shortName: 'base' },
  { id: 137, name: 'Polygon', shortName: 'polygon' },
  { id: 10, name: 'Optimism', shortName: 'optimism' },
  { id: 42161, name: 'Arbitrum', shortName: 'arbitrum' },
];

const CHAIN_COLORS: Record<number, string> = {
  8453: '#0052FF',
  137: '#8247E5',
  10: '#FF0420',
  42161: '#28A0F0',
};

type ChainSelectorProps = {
  selectedChainId?: number;
  onSelect: (chain: Chain) => void;
  disabled?: boolean;
  showAll?: boolean;
};

export function ChainSelector({ selectedChainId, onSelect, disabled, showAll }: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = SUPPORTED_CHAINS.find((c) => c.id === selectedChainId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-sherpa-surface2 bg-sherpa-surface px-3 py-2 text-sm text-sherpa-fg hover:border-sherpa-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selected ? (
          <>
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: CHAIN_COLORS[selected.id] ?? '#888' }}
            />
            <span>{selected.name}</span>
          </>
        ) : (
          <span>{showAll ? 'All Chains' : 'Select Chain'}</span>
        )}
        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-48 rounded-lg border border-sherpa-surface2 bg-sherpa-surface shadow-lg">
          {showAll && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-sherpa-fg hover:bg-sherpa-surface2"
              onClick={() => {
                onSelect({ id: 0, name: 'All Chains', shortName: 'all' });
                setOpen(false);
              }}
            >
              <span className="inline-block h-3 w-3 rounded-full bg-gray-400" />
              All Chains
            </button>
          )}
          {SUPPORTED_CHAINS.map((chain) => (
            <button
              key={chain.id}
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sherpa-surface2 ${
                chain.id === selectedChainId ? 'text-sherpa-blue' : 'text-sherpa-fg'
              }`}
              onClick={() => {
                onSelect(chain);
                setOpen(false);
              }}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: CHAIN_COLORS[chain.id] ?? '#888' }}
              />
              {chain.name}
              <span className="ml-auto text-xs text-sherpa-fg/50">{chain.shortName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { SUPPORTED_CHAINS, CHAIN_COLORS };
