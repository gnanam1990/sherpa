import { AppShell } from '../_components/app-shell';
import { Stage2ComingSoon } from '../_components/Stage2ComingSoon';

export default function RepayPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Stage2ComingSoon feature="repay" mainnetEnabled />
      </div>
    </AppShell>
  );
}
