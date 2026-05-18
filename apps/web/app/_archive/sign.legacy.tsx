/* Legacy /sign page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { Suspense } from 'react';
import { SignFlow } from './SignFlow';

export default function SignPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <SignFlow />
      </Suspense>
    </main>
  );
}
