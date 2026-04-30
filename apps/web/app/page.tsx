import { Shell, tokens } from '@sherpa/ui';
import { Prompt } from './_components/Prompt';

export default function HomePage() {
  return (
    <Shell>
      <header style={{ textAlign: 'center', marginTop: 24 }}>
        <h1 style={{ margin: 0, color: tokens.color.baseBlue, fontSize: 40, letterSpacing: -1 }}>
          Sherpa
        </h1>
        <p style={{ color: tokens.color.muted, marginTop: 8 }}>
          Type anything. Sherpa does it on Base.
        </p>
      </header>
      <Prompt />
      <footer style={{ marginTop: 'auto', color: tokens.color.muted, fontSize: 12 }}>
        Stage 1 · Base Sepolia · <span style={{ color: tokens.color.success }}>sponsored gas</span>
      </footer>
    </Shell>
  );
}
