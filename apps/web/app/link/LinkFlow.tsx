'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

export function LinkFlow() {
  const searchParams = useSearchParams();
  const tgUserId = searchParams.get('tg');
  const fid = searchParams.get('fid');
  const { address, isConnected } = useAccount();
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const surface = tgUserId ? 'telegram' : fid ? 'farcaster' : null;
  const surfaceUserId = tgUserId || fid;
  const surfaceLabel = surface === 'telegram' ? 'Telegram' : 'Farcaster';

  const { signMessage } = useSignMessage({
    mutation: {
      onSuccess: async (signature, variables) => {
        if (!surface || !surfaceUserId || !address) return;
        setSigning(true);
        try {
          const res = await fetch(`/api/surfaces/${surface}/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              [surface === 'telegram' ? 'tgUserId' : 'fid']: Number(surfaceUserId),
              address,
              signature,
              message: variables.message,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `HTTP ${res.status}`);
          }
          setLinked(true);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setSigning(false);
        }
      },
      onError: (err) => setError(err.message),
    },
  });

  function handleLink() {
    if (!surface || !surfaceUserId || !address) return;
    const message = `Link Sherpa ${surface} user ${surfaceUserId} at ${Date.now()}`;
    signMessage({ message });
  }

  if (!surface || !surfaceUserId) {
    return (
      <div className="max-w-md w-full bg-slate-900 rounded-xl p-6 text-center">
        <div className="text-red-400">Missing link parameters</div>
      </div>
    );
  }

  if (linked) {
    return (
      <div className="max-w-md w-full bg-slate-900 rounded-xl p-6 text-center">
        <div className="text-green-400 text-lg font-medium mb-2">Linked!</div>
        <div className="text-slate-300 mb-4">
          Your {surfaceLabel} account is now connected to your wallet.
        </div>
        <a
          href="tg://"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Return to {surfaceLabel}
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-slate-900 rounded-xl p-6 text-center">
      <h1 className="text-lg font-medium text-white mb-2">Link {surfaceLabel}</h1>
      <p className="text-slate-400 text-sm mb-4">
        Connect your Smart Wallet to link your {surfaceLabel} account.
      </p>
      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
      <button
        onClick={handleLink}
        disabled={!isConnected || signing}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {!isConnected ? 'Connect Wallet' : signing ? 'Signing...' : 'Link Account'}
      </button>
    </div>
  );
}
