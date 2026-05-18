import { AppShell } from '../_components/app-shell';
import { Stage2ComingSoon } from '../_components/Stage2ComingSoon';

export default function WithdrawPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Stage2ComingSoon feature="withdraw" mainnetEnabled />
      </div>
    </AppShell>
  );
}
