'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import { AlertCircle } from './_components/icons';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="m-0 bg-sherpa-bg font-sans text-sherpa-fg">
        <main
          id="main-content"
          className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-sherpa-bg px-6 py-12 text-center text-sherpa-fg"
        >
          <AlertCircle
            className="h-12 w-12 text-sherpa-danger"
            aria-hidden="true"
            width={48}
            height={48}
          />
          <div className="flex max-w-md flex-col gap-2">
            <h1 className="m-0 text-2xl font-semibold sm:text-3xl">
              Something went wrong
            </h1>
            <p className="m-0 text-sm text-sherpa-muted">
              We&apos;ve been notified and we&apos;re looking into it.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-sherpa-blue px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-sherpa-muted transition hover:text-sherpa-fg"
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
