import Link from 'next/link';
import { Stage2ComingSoon } from '../_components/Stage2ComingSoon';

export default function LendPage() {
  return (
    <main className="min-h-[100dvh] bg-sherpa-bg px-4 py-8 text-sherpa-fg sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm text-sherpa-muted transition hover:text-sherpa-fg" href="/">
          Back to Sherpa
        </Link>
        <div className="mt-6">
          <Stage2ComingSoon feature="lend" testnetEnabled />
        </div>
      </div>
    </main>
  );
}
