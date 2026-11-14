'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Spinner } from '@/components/ui';
import { api, ApiClientError } from '@/lib/api';
import { useMe } from '@/lib/queries';

const nav = [
  { href: '/app', label: 'Applications' },
  { href: '/app/profile', label: 'Profile' },
];

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

  if (me.isPending || unauthenticated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label={me.isPending ? 'Waking up FitCV…' : 'Redirecting…'} />
      </div>
    );
  }

  const user = me.data?.user;
  const usage = me.data?.usage;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-5">
          <Logo href="/app" />
          <nav className="flex min-w-0 gap-0.5 sm:gap-1" aria-label="Main">
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
                    'rounded-md px-2 py-1.5 text-sm font-medium sm:px-3',
                    active ? 'bg-canvas text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {usage && usage.aiDailyLimit > 0 && (
              <span
                className="hidden text-xs text-muted sm:inline"
                title="AI generations in the last 24 hours"
              >
                {usage.aiCallsToday}/{usage.aiDailyLimit} AI runs today
              </span>
            )}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="size-7 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
                {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
