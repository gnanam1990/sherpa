import Link from 'next/link';

const SHERPA_ASCII = `      /\\
     /  \\
    / /\\ \\
   / /  \\ \\
  / /____\\ \\
 /__________\\
   404 · lost on the mountain`;

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-sherpa-bg px-6 py-12 text-center text-sherpa-fg"
    >
      <pre
        aria-hidden="true"
        className="m-0 whitespace-pre font-mono text-xs leading-tight text-sherpa-muted sm:text-sm"
      >
        {SHERPA_ASCII}
      </pre>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
          Page not found
        </h1>
        <p className="m-0 text-sm text-sherpa-muted">
          You wandered off the trail. The page you&apos;re looking for
          doesn&apos;t exist — or it moved while you weren&apos;t watching.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-sherpa-blue px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
      >
        Back to home
      </Link>
    </main>
  );
}
