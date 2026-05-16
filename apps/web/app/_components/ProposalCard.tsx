'use client';

import { useState } from 'react';
import VoteDialog from './VoteDialog';

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
  proposer?: string;
  choices?: string[];
  scores?: number[];
  scores_total?: number;
};

function formatNumber(val: string | number | number[] | undefined): string {
  if (val === undefined || val === null) return '0';
  if (Array.isArray(val)) return val.reduce((a, b) => a + b, 0).toLocaleString();
  return Number(val).toLocaleString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'passed': case 'succeeded': return 'bg-blue-100 text-blue-800';
    case 'rejected': case 'defeated': return 'bg-red-100 text-red-800';
    case 'executed': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getSourceLabel(source?: string): string {
  switch (source) {
    case 'snapshot': return 'Snapshot';
    case 'aave': return 'Aave';
    case 'compound': return 'Compound';
    case 'optimism': return 'Optimism';
    default: return 'On-chain';
  }
}

export default function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [showVoteDialog, setShowVoteDialog] = useState(false);

  const votesFor = proposal.scores?.[0] ?? proposal.votesFor;
  const votesAgainst = proposal.scores?.[1] ?? proposal.votesAgainst;
  const votesAbstain = proposal.scores?.[2] ?? proposal.votesAbstain;

  const totalVotes = Number(formatNumber(votesFor).replace(/,/g, '')) +
    Number(formatNumber(votesAgainst).replace(/,/g, '')) +
    Number(formatNumber(votesAbstain).replace(/,/g, ''));
  const forPct = totalVotes > 0 ? (Number(formatNumber(votesFor).replace(/,/g, '')) / totalVotes) * 100 : 0;

  const endTime = typeof proposal.endTime === 'number'
    ? new Date(proposal.endTime * (proposal.endTime > 1e12 ? 1 : 1000))
    : new Date(proposal.endTime);

  const isEnded = endTime < new Date();

  return (
    <>
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(proposal.status)}`}>
                {proposal.status}
              </span>
              <span className="text-xs text-gray-500">{getSourceLabel(proposal.source)}</span>
              {proposal.space && (
                <span className="text-xs text-gray-400">{proposal.space.name}</span>
              )}
            </div>
            <h3 className="font-medium truncate">{proposal.title}</h3>
            {proposal.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{proposal.description}</p>
            )}
          </div>
          {proposal.link && (
            <a
              href={proposal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 text-sm shrink-0"
            >
              View
            </a>
          )}
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>For: {formatNumber(votesFor)}</span>
            <span>Against: {formatNumber(votesAgainst)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full"
              style={{ width: `${Math.min(forPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Abstain: {formatNumber(votesAbstain)}</span>
            <span>Ends: {endTime.toLocaleDateString()}</span>
          </div>
        </div>

        {proposal.status === 'active' && !isEnded && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowVoteDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Vote
            </button>
          </div>
        )}
      </div>

      {showVoteDialog && (
        <VoteDialog
          proposal={proposal}
          onClose={() => setShowVoteDialog(false)}
        />
      )}
    </>
  );
}
