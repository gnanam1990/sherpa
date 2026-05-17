import Link from 'next/link';

type ComingSoonPlaceholderProps = {
  feature: string;
};

export function ComingSoonPlaceholder({ feature }: ComingSoonPlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{feature} — Coming Soon</h1>
      <p className="max-w-md text-muted-foreground">
        This feature is not enabled in this environment yet. Stage 2 mainnet actions
        are live from the connected web app when the production flags are enabled.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Back to Home
      </Link>
    </div>
  );
}
