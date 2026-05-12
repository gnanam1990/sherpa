export default function Loading() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Loading"
      className="flex h-[100dvh] flex-col items-center gap-4 overflow-hidden bg-sherpa-bg px-4 py-4 text-sherpa-fg sm:px-6"
    >
      <header className="flex w-full max-w-5xl items-center justify-between gap-4">
        <span className="text-sm font-semibold tracking-[-0.02em] text-sherpa-blue">
          Sherpa
        </span>
        <span
          aria-hidden="true"
          className="h-9 w-24 rounded-full border border-sherpa-surface2 bg-sherpa-surface"
        />
      </header>

      <section className="flex w-full max-w-2xl flex-col items-center gap-3 pt-6 text-center">
        <span
          aria-hidden="true"
          className="h-12 w-40 rounded-md bg-sherpa-surface sm:h-14 sm:w-48"
        />
        <span aria-hidden="true" className="h-4 w-64 rounded-md bg-sherpa-surface" />
      </section>

      <section
        aria-hidden="true"
        className="mt-2 w-full max-w-2xl rounded-2xl border border-sherpa-surface2 bg-sherpa-surface/60 p-4"
      >
        <span className="block h-11 w-full rounded-xl border border-sherpa-surface2 bg-sherpa-bg/40" />
      </section>
    </main>
  );
}
