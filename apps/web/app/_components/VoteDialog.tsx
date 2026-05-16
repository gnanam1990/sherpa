'use client';

import { useState } from 'react';

type Proposal = {
  id: string;
  title: string;
  source?: string;
  space?: { id: string; name: string };
  choices?: string[];
};

type VoteDialogProps = {
  proposal: Proposal;
  onClose: () => void;
};

export default function VoteDialog({ proposal, onClose }: VoteDialogProps) {
  const [choice, setChoice] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const defaultChoices = ['For', 'Against', 'Abstain'];
  const choices = proposal.choices?.length ? proposal.choices : defaultChoices;

  const handleSubmit = async () => {
    if (!choice) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/governance/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          voterAddress: '0x0000000000000000000000000000000000000000',
          support: choice.toLowerCase(),
          reason: reason || undefined,
          source: proposal.source || 'snapshot',
          space: proposal.space?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: 'Vote prepared successfully!' });
      } else {
        setResult({ success: false, message: data.error || 'Vote failed' });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">Vote on Proposal</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{proposal.title}</p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Vote</label>
          <div className="grid grid-cols-3 gap-2">
            {choices.map((c) => (
              <button
                key={c}
                onClick={() => setChoice(c)}
                className={`py-2 px-3 text-sm rounded-lg border-2 transition-colors ${
                  choice === c
                    ? c.toLowerCase() === 'for' || c.toLowerCase() === 'yes'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : c.toLowerCase() === 'against' || c.toLowerCase() === 'no'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you voting this way?"
            className="w-full border rounded-lg p-2 text-sm resize-none h-20"
          />
        </div>

        {result && (
          <div className={`p-3 rounded-lg text-sm ${
            result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {result.message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!choice || submitting}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
