'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Briefcase, FileCheck2, Plus, UserRound } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type ApplicationSummary,
} from '@fitcv/shared';
import { Alert, EmptyState, Select, Skeleton, scoreColor } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useApplications, useProfile, useUpdateApplication } from '@/lib/queries';

const BOARD: ApplicationStatus[] = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'];
const CLOSED: ApplicationStatus[] = ['REJECTED', 'WITHDRAWN'];
const DOT: Record<ApplicationStatus, string> = {
  SAVED: 'bg-slate-400',
  APPLIED: 'bg-sky-500',
  INTERVIEWING: 'bg-amber-500',
  OFFER: 'bg-accent',
  REJECTED: 'bg-rose-400',
  WITHDRAWN: 'bg-slate-300',
};

function NewButton({ label = 'New application' }: { label?: string }) {
  return (
    <Link
      href="/app/applications/new"
      className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] transition-all duration-200 hover:bg-accent-strong hover:shadow-[var(--shadow-accent)] active:translate-y-px"
    >
      <Plus className="size-4" aria-hidden /> {label}
    </Link>
  );
}

function StatusSelect({ app }: { app: ApplicationSummary }) {
  const update = useUpdateApplication(app.id);
  return (
    <Select
      aria-label={`Status for ${app.jobTitle} at ${app.company}`}
      value={app.status}
      disabled={update.isPending}
      onChange={(e) => update.mutate({ status: e.target.value as ApplicationStatus })}
      className="!h-8 !w-[7.5rem] !rounded-lg !px-2.5 text-xs"
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}

function AppCard({ app }: { app: ApplicationSummary }) {
  const score = app.tailoredScore ?? app.matchScore;
  return (
    <article className="group relative rounded-xl bg-paper p-4 shadow-[var(--shadow-soft)] ring-1 ring-line/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:ring-line-strong">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/app/applications/${app.id}`}
          className="min-w-0 after:absolute after:inset-0 after:rounded-xl after:content-['']"
        >
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{app.jobTitle}</h3>
          <p className="truncate text-sm text-muted">{app.company}</p>
        </Link>
        {score !== null && (
          <span
            className="tabular shrink-0 text-lg font-semibold tracking-tight"
            style={{ color: scoreColor(score) }}
            title={app.tailoredScore !== null ? 'Tailored CV match' : 'Profile match'}
          >
            {score}
            <span className="text-xs font-medium">%</span>
          </span>
        )}
      </div>
      {/* Controls sit above the full-card link. */}
      <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
        <StatusSelect app={app} />
        {app.hasDocuments && (
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-accent-strong">
            <FileCheck2 className="size-3.5" aria-hidden /> CV ready
          </span>
        )}
      </div>
    </article>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Loading applications">
      {BOARD.map((s) => (
        <div key={s} className="space-y-3 rounded-2xl bg-sunk/60 p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-[104px] w-full !rounded-xl" />
          <Skeleton className="h-[104px] w-full !rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function ApplicationsPage() {
  const apps = useApplications();
  const profile = useProfile();
  const profileEmpty = profile.data && !profile.data.updatedAt;

  const grouped = useMemo(() => {
    const g = Object.fromEntries(
      APPLICATION_STATUSES.map((s) => [s, [] as ApplicationSummary[]]),
    ) as Record<ApplicationStatus, ApplicationSummary[]>;
    for (const a of apps.data ?? []) g[a.status].push(a);
    return g;
  }, [apps.data]);

  const closed = CLOSED.flatMap((s) => grouped[s]);
  const total = apps.data?.length ?? 0;
  const active = total - closed.length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="display text-4xl">Applications</h1>
          <p className="mt-2 text-sm text-muted">
            {total === 0 ? (
              'Every job you are going after, from saved to offer.'
            ) : (
              <span className="tabular">
                {active} active · {grouped.INTERVIEWING.length} interviewing ·{' '}
                {grouped.OFFER.length} {grouped.OFFER.length === 1 ? 'offer' : 'offers'}
              </span>
            )}
          </p>
        </div>
        <NewButton />
      </div>

      {profileEmpty && (
        <Link
          href="/app/profile"
          className="group mb-8 flex items-center justify-between gap-4 rounded-2xl bg-accent-faint px-5 py-4 ring-1 ring-accent/15 transition-colors hover:bg-accent-soft/60"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-accent shadow-[var(--shadow-soft)]">
              <UserRound className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Start with your profile</p>
              <p className="text-sm text-ink-soft">
                Every tailored CV is built from it. Upload your CV and it fills in for you.
              </p>
            </div>
          </div>
          <ArrowRight
            className="size-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}

      {apps.isPending ? (
        <BoardSkeleton />
      ) : apps.error ? (
        <Alert>{errorMessage(apps.error)}</Alert>
      ) : total === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-5" strokeWidth={1.75} />}
          title="No applications yet"
          body="Add a job you want, paste its description, and FitCV will tailor your CV and cover letter to it."
          action={<NewButton label="Add your first job" />}
        />
      ) : (
        <>
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
            {BOARD.map((status) => (
              <section
                key={status}
                aria-label={STATUS_LABELS[status]}
                className="flex flex-col rounded-2xl bg-sunk/60 p-2.5"
              >
                <h2 className="mb-2.5 flex items-center gap-2 px-1.5 pt-1 text-[13px] font-semibold text-ink-soft">
                  <span className={clsx('size-2 rounded-full', DOT[status])} aria-hidden />
                  {STATUS_LABELS[status]}
                  <span className="tabular ml-auto text-xs font-medium text-muted">
                    {grouped[status].length}
                  </span>
                </h2>
                <div className="space-y-2.5">
                  {grouped[status].map((a) => (
                    <AppCard key={a.id} app={a} />
                  ))}
                  {grouped[status].length === 0 && (
                    <p className="rounded-xl border border-dashed border-line-strong/70 px-3 py-6 text-center text-xs text-muted">
                      Nothing here yet
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
          {closed.length > 0 && (
            <section className="mt-10">
              <h2 className="eyebrow mb-3">Closed · {closed.length}</h2>
              <div className="grid gap-2.5 opacity-80 sm:grid-cols-2 lg:grid-cols-4">
                {closed.map((a) => (
                  <AppCard key={a.id} app={a} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
