import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function NotFound() {
  return (
    <main id="main" className="bg-dots relative grid min-h-dvh place-items-center px-5 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/30 via-canvas/80 to-canvas" />
      <div className="relative">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <p className="display tabular text-8xl text-accent">404</p>
        <h1 className="mt-4 text-xl font-semibold">This page doesn&apos;t fit anything we have</h1>
        <p className="mt-2 text-sm text-muted">The link may be old, or the item was deleted.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex h-10 items-center rounded-[10px] bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            Go to my applications
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-medium text-ink-soft transition-colors hover:bg-sunk"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
