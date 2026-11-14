import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <p className="font-serif text-5xl text-accent">404</p>
        <h1 className="mt-3 text-xl font-semibold">This page doesn&apos;t fit anything we have</h1>
        <p className="mt-2 text-sm text-muted">
          The link may be old, or the item may have been deleted.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong"
        >
          Back to my applications
        </Link>
      </div>
    </main>
  );
}
