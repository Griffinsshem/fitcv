'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/logo';
import { api, ApiClientError } from '@/lib/api';
import { useMe } from '@/lib/queries';

const nav = [
  { href: '/app', label: 'Applications' },
  { href: '/app/profile', label: 'Profile' },
];

/** Full-page state while the free-tier API wakes up (can take ~30-50 s). */
function WakingUp({ redirecting }: { redirecting: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid min-h-dvh place-items-center px-6" role="status">
      <div className="flex flex-col items-center text-center">
        <div className="animate-pulse">
          <Logo href="/" />
        </div>
        <p className="mt-6 text-sm font-medium text-ink">
          {redirecting ? 'Taking you to sign in…' : 'Getting your workspace ready…'}
        </p>
        <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-sunk">
          <div className="skeleton h-full w-full !rounded-full !bg-[linear-gradient(90deg,transparent,rgb(15_118_110/0.6),transparent)]" />
        </div>
        {slow && !redirecting && (
          <p className="animate-fade mt-5 max-w-xs text-xs leading-relaxed text-muted">
            The first visit after a quiet spell takes up to a minute while the server wakes up.
          </p>
        )}
      </div>
    </div>
  );
}

function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div
      className="hidden items-center gap-2.5 sm:flex"
      title={`${used} of ${limit} AI runs used in the last 24 hours`}
    >
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sunk">
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-500',
            pct >= 90 ? 'bg-warn' : 'bg-accent',
          )}
          style={{ width: `${Math.max(pct, used > 0 ? 6 : 0)}%` }}
        />
      </div>
      <span className="tabular text-xs text-muted">
        {used}/{limit} AI runs
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();

  const unauthenticated = me.error instanceof ApiClientError && me.error.status === 401;
  useEffect(() => {
    if (unauthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [unauthenticated, pathname, router]);

  async function signOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.clear();
    router.replace('/login');
  }

  if (me.isPending || unauthenticated) return <WakingUp redirecting={unauthenticated} />;

  const user = me.data?.user;
  const usage = me.data?.usage;
  const initial = (user?.name || user?.email || '?').slice(0, 1).toUpperCase();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-8 sm:px-5">
          <Logo href="/app" />
          <nav className="flex h-full min-w-0 items-stretch gap-1 sm:gap-2" aria-label="Main">
            {nav.map((n) => {
              const active =
                n.href === '/app'
                  ? pathname === '/app' || pathname.startsWith('/app/applications')
                  : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative flex items-center px-2 text-sm font-medium transition-colors sm:px-2.5',
                    active ? 'text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {n.label}
                  <span
                    className={clsx(
                      'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent transition-opacity duration-200',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
            {usage && usage.aiDailyLimit > 0 && (
              <UsageMeter used={usage.aiCallsToday} limit={usage.aiDailyLimit} />
            )}
            <div className="flex items-center gap-1 rounded-xl bg-paper p-1 pr-1 shadow-[var(--shadow-soft)] ring-1 ring-line">
              {user?.avatarUrl ? (
                // Google profile photo (allowed by CSP img-src).
                <img
                  src={user.avatarUrl}
                  alt={user.name ? `${user.name}'s profile photo` : 'Your profile photo'}
                  className="size-7 rounded-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-xs font-semibold text-accent-strong">
                  {initial}
                </span>
              )}
              <button
                onClick={signOut}
                className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-sunk hover:text-ink"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        {children}
      </main>
    </div>
  );
}
