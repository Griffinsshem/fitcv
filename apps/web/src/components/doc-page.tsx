import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './logo';

/** Simple long-form page shell for Privacy / Terms. */
export function DocPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Home
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <p className="eyebrow">Last updated {updated}</p>
        <h1 className="display mt-3 text-5xl">{title}</h1>
        <div className="mt-10 max-w-[65ch] space-y-6 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
      </main>
    </div>
  );
}
