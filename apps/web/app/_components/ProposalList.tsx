'use client';

import { useState, useEffect } from 'react';
import ProposalCard from './ProposalCard';

type Proposal = {
  id: string;
  title: string;
  description?: string;
  status: string;
  votesFor: string | number[];
  votesAgainst: string | number[];
  votesAbstain: string | number[];
  quorum: string | number;
  endTime: number | string;
  source?: string;
  space?: { id: string; name: string };
  link?: string;
};

export default function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (source) params.set('source', source);
        const res = await fetch(`/api/governance/proposals?${params}`);
        if (!res.ok) throw new Error('Failed to fetch proposals');
        const data = await res.json();
        setProposals(data.proposals ?? []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [source]);

  const sources = [
    { value: '', label: 'All' },
    { value: 'snapshot', label: 'Snapshot' },
    { value: 'aave', label: 'Aave' },
    { value: 'compound', label: 'Compound' },
    { value: 'optimism', label: 'Optimism' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Governance Proposals</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {sources.map((s) => (
            <button
              key={s.value}
              onClick={() => setSource(s.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                source === s.value
                  ? 'bg-white shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">Loading proposals...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500">{error}</div>
      )}

      {!loading && !error && proposals.length === 0 && (
        <div className="text-center py-8 text-gray-500">No active proposals found</div>
      )}

      <div className="grid gap-4">
        {proposals.map((p) => (
          <ProposalCard key={`${p.source}-${p.id}`} proposal={p} />
        ))}
      </div>
    </div>
  );
}
