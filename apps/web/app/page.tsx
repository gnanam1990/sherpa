import { tokens } from '@sherpa/ui';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '1rem',
      }}
    >
      <h1 style={{ margin: 0, color: tokens.color.baseBlue }}>Sherpa</h1>
      <p style={{ opacity: 0.7 }}>The natural-language Base agent. Week-1 scaffold.</p>
    </main>
  );
}
