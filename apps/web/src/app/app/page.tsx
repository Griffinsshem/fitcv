'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Briefcase, Plus, UserRound } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type ApplicationSummary,
} from '@fitcv/shared';
import { Alert, Badge, EmptyState, Select, Spinner } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useApplications, useProfile, useUpdateApplication } from '@/lib/queries';

const BOARD: ApplicationStatus[] = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'];
const CLOSED: ApplicationStatus[] = ['REJECTED', 'WITHDRAWN'];

function scoreTone(s: number | null) {
  if (s === null) return 'neutral' as const;
  return s >= 75 ? ('accent' as const) : s >= 50 ? ('warn' as const) : ('danger' as const);
}

function StatusSelect({ app }: { app: ApplicationSummary }) {
  const update = useUpdateApplication(app.id);
  return (
    <Select
      aria-label={`Status for ${app.jobTitle} at ${app.company}`}
      value={app.status}
      disabled={update.isPending}
      onChange={(e) => update.mutate({ status: e.target.value as ApplicationStatus })}
      className="h-8 w-32 text-xs"
      onClick={(e) => e.stopPropagation()}
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
    <div className="rounded-lg border border-line bg-paper p-3.5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/app/applications/${app.id}`} className="block min-w-0">
          <p className="truncate text-sm font-semibold">{app.jobTitle}</p>
          <p className="truncate text-sm text-muted">{app.company}</p>
        </Link>
        {score !== null && <Badge tone={scoreTone(score)}>{score}%</Badge>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusSelect app={app} />
        {app.hasDocuments && <Badge>CV ready</Badge>}
      </div>
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted">
            Every job you are going after, from saved to offer.
          </p>
        </div>
        <Link
          href="/app/applications/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong"
        >
          <Plus className="size-4" aria-hidden /> New application
        </Link>
      </div>

      {profileEmpty && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent/20 bg-accent-soft/50 px-4 py-3">
          <p className="text-sm text-accent-strong">
            <strong>Start with your profile.</strong> FitCV tailors from it, so the better it is,
            the better every CV.
          </p>
          <Link
            href="/app/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong underline-offset-2 hover:underline"
          >
            <UserRound className="size-4" aria-hidden /> Set up profile
          </Link>
        </div>
      )}

      {apps.isPending ? (
        <Spinner />
      ) : apps.error ? (
        <Alert>{errorMessage(apps.error)}</Alert>
      ) : apps.data.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-5" />}
          title="No applications yet"
          body="Add a job you want, paste its description, and FitCV will tailor your CV and cover letter to it."
          action={
            <Link
              href="/app/applications/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong"
            >
              <Plus className="size-4" aria-hidden /> Add your first job
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {BOARD.map((status) => (
              <section
                key={status}
                aria-label={STATUS_LABELS[status]}
                className="rounded-card bg-canvas p-3 ring-1 ring-line"
              >
                <h2 className="mb-3 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {STATUS_LABELS[status]}
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-soft ring-1 ring-line">
                    {grouped[status].length}
                  </span>
                </h2>
                <div className="space-y-2.5">
                  {grouped[status].map((a) => (
                    <AppCard key={a.id} app={a} />
                  ))}
                  {grouped[status].length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-muted">Nothing here</p>
                  )}
                </div>
              </section>
            ))}
          </div>
          {closed.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Closed ({closed.length})
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
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
