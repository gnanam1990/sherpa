import { AppShell } from '../_components/app-shell';
import { Stage2ComingSoon } from '../_components/Stage2ComingSoon';

export default function LendPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Stage2ComingSoon feature="lend" mainnetEnabled />
      </div>
    </AppShell>
  );
}
