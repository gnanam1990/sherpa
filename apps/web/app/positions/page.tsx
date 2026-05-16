import Link from 'next/link';
import { PositionsView } from '../_components/PositionsView';

export default function PositionsPage() {
  return (
    <main className="min-h-[100dvh] bg-sherpa-bg px-4 py-8 text-sherpa-fg sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          className="text-sm text-sherpa-muted transition hover:text-sherpa-fg"
          href="/"
        >
          Back to Sherpa
        </Link>
        <h1 className="mb-2 mt-6 text-3xl font-semibold tracking-[-0.03em]">
          Aave Positions
        </h1>
        <p className="mb-6 text-sm text-sherpa-muted">
          Read-only view of your Aave V3 position on Base mainnet.
        </p>
        <PositionsView />
      </div>
    </main>
  );
}
