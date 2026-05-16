'use client';

import { useState, useEffect } from 'react';

type DelegationStatus = {
  protocol: string;
  delegatee: string | null;
  active: boolean;
};

export default function DelegationCard({ address }: { address: string }) {
  const [delegations, setDelegations] = useState<DelegationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [delegatee, setDelegatee] = useState('');
  const [protocol, setProtocol] = useState('aave');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchDelegations = async () => {
      try {
        const res = await fetch(`/api/governance/delegations/${address}`);
        if (res.ok) {
          const data = await res.json();
          setDelegations(data.delegations ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    if (address) fetchDelegations();
  }, [address]);

  const handleDelegate = async () => {
    if (!delegatee || !address) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/governance/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegatorAddress: address,
          delegateeAddress: delegatee,
          protocol,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Delegation prepared for ${protocol}` });
      } else {
        setResult({ success: false, message: data.error || 'Delegation failed' });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (proto: string) => {
    try {
      const res = await fetch('/api/governance/delegate/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegatorAddress: address, protocol: proto }),
      });
      if (res.ok) {
        setDelegations((prev) => prev.map((d) =>
          d.protocol === proto ? { ...d, active: false, delegatee: null } : d
        ));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Voting Power Delegation</h3>

      {loading && <p className="text-sm text-gray-500">Loading delegations...</p>}

      {!loading && delegations.length > 0 && (
        <div className="space-y-2">
          {delegations.map((d) => (
            <div
              key={d.protocol}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="text-sm font-medium capitalize">{d.protocol}</span>
                <p className="text-xs text-gray-500">
                  {d.active && d.delegatee
                    ? `Delegated to ${d.delegatee.slice(0, 6)}...${d.delegatee.slice(-4)}`
                    : 'Not delegated'}
                </p>
              </div>
              {d.active && (
                <button
                  onClick={() => handleRevoke(d.protocol)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-4 space-y-3">
        <h4 className="text-sm font-medium">Delegate Voting Power</h4>
        <div className="flex gap-2">
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="aave">Aave</option>
            <option value="compound">Compound</option>
            <option value="optimism">Optimism</option>
          </select>
          <input
            type="text"
            value={delegatee}
            onChange={(e) => setDelegatee(e.target.value)}
            placeholder="0x... delegatee address"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleDelegate}
          disabled={!delegatee || submitting}
          className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Preparing...' : 'Delegate'}
        </button>
      </div>

      {result && (
        <div className={`p-3 rounded-lg text-sm ${
          result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
