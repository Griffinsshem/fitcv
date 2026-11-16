'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type JobView,
} from '@fitcv/shared';
import { Alert, Button, Card, ScoreRing, Select, Skeleton } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import {
  keys,
  useApplication,
  useDeleteApplication,
  useStartJob,
  useUpdateApplication,
} from '@/lib/queries';
import { CoverLetterTab, CvTab, JobTab, MatchTab } from './tabs';

const TABS = ['match', 'cv', 'letter', 'job'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  match: 'Match report',
  cv: 'Tailored CV',
  letter: 'Cover letter',
  job: 'Job & notes',
};

const STAGES = {
  ANALYZE: ['Reading the job ad', 'Ranking the keywords', 'Scoring your profile'],
  GENERATE: [
    'Reading the job ad',
    'Matching your experience',
    'Rewriting your CV',
    'Writing your cover letter',
    'Running the honesty check',
  ],
  IMPORT_CV: ['Reading your CV'],
} as const;

/** Live progress for a background AI run: elapsed time + estimated stage. */
function RunningProgress({ job }: { job: JobView }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.round((now - new Date(job.createdAt).getTime()) / 1000));
  const stages = STAGES[job.kind];
  // Stages advance on a typical timeline; the last one holds until done.
  const current = Math.min(stages.length - 1, Math.floor(elapsed / 9));
  return (
    <div role="status" aria-live="polite">
      <ol className="space-y-2">
        {stages.map((s, i) => (
          <li
            key={s}
            className={clsx(
              'flex items-center gap-2.5 text-sm transition-colors duration-300',
              i < current && 'text-muted',
              i === current && 'font-medium text-ink',
              i > current && 'text-muted/50',
            )}
          >
            <span
              className={clsx(
                'grid size-4 place-items-center rounded-full',
                i < current && 'bg-accent text-white',
                i === current && 'ring-2 ring-accent/30',
                i > current && 'ring-1 ring-line-strong',
              )}
            >
              {i < current ? (
                <Check className="size-2.5" strokeWidth={3} />
              ) : i === current ? (
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              ) : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p className="tabular mt-4 text-xs text-muted">
        {elapsed}s · usually 20–60s. You can leave this page; it keeps working.
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-label="Loading application">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-6 h-10 w-80 max-w-full" />
      <Skeleton className="mt-3 h-4 w-40" />
      <Skeleton className="mt-8 h-44 w-full !rounded-2xl" />
      <Skeleton className="mt-10 h-9 w-96 max-w-full" />
      <Skeleton className="mt-6 h-64 w-full !rounded-2xl" />
    </div>
  );
}

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const app = useApplication(id);
  const update = useUpdateApplication(id);
  const start = useStartJob(id);
  const del = useDeleteApplication();
  const [tab, setTab] = useState<Tab>('match');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();
  const jobState = app.data?.activeJob?.status;

  // When an AI run finishes (either way), refresh the usage counter.
  useEffect(() => {
    if (jobState === 'SUCCEEDED' || jobState === 'FAILED') {
      void qc.invalidateQueries({ queryKey: keys.me });
    }
  }, [jobState, qc]);

  if (app.isPending) return <DetailSkeleton />;
  if (app.error) return <Alert>{errorMessage(app.error)}</Alert>;
  const a = app.data;

  const job = a.activeJob;
  const running = job?.status === 'PENDING' || job?.status === 'RUNNING';
  const failed = job?.status === 'FAILED';
  const hasDocs = !!a.tailoredCv && !!a.coverLetter;
  const delta =
    a.matchScore !== null && a.tailoredScore !== null ? a.tailoredScore - a.matchScore : null;

  return (
    <div>
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Applications
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <h1 className="display text-4xl sm:text-5xl">{a.jobTitle}</h1>
          <p className="mt-2 flex items-center gap-2 text-ink-soft">
            {a.company}
            {a.jobUrl && (
              <a
                href={a.jobUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
              >
                <ExternalLink className="size-3.5" aria-hidden /> View posting
              </a>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Application status"
            value={a.status}
            onChange={(e) => update.mutate({ status: e.target.value as ApplicationStatus })}
            className="w-40"
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                loading={del.isPending}
                onClick={async () => {
                  await del.mutateAsync(a.id);
                  router.replace('/app');
                }}
              >
                Delete “{a.company}” application
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              aria-label="Delete application"
              title="Delete application"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>

      <Card className="mt-8 overflow-hidden">
        <div className="grid md:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center gap-5 border-b border-line/80 bg-canvas/60 px-8 py-7 md:border-b-0 md:border-r">
            <ScoreRing score={a.matchScore} label="Your profile" />
            <div className="flex flex-col items-center gap-1">
              <span className="h-px w-8 bg-line-strong" aria-hidden />
              {delta !== null && (
                <span
                  className={clsx(
                    'tabular rounded-md px-1.5 py-0.5 text-xs font-semibold',
                    delta > 0 ? 'bg-accent-soft text-accent-strong' : 'bg-sunk text-muted',
                  )}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </div>
            <ScoreRing score={a.tailoredScore} label="Tailored CV" size={88} />
          </div>
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-7 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              {running && job ? (
                <RunningProgress job={job} />
              ) : (
                <>
                  <p className="font-semibold">
                    {hasDocs
                      ? 'Your documents are ready'
                      : a.analysis
                        ? 'Match checked'
                        : 'Ready when you are'}
                  </p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-soft">
                    {hasDocs
                      ? 'Review, edit and download your tailored CV and cover letter below.'
                      : a.analysis
                        ? 'Tailor your CV to close the gaps and get a matching cover letter.'
                        : 'Check your match first, or go straight to a tailored CV and cover letter.'}
                  </p>
                  {failed && job?.error && (
                    <div className="mt-3">
                      <Alert>{job.error}</Alert>
                    </div>
                  )}
                  {start.error && (
                    <div className="mt-3">
                      <Alert>{errorMessage(start.error)}</Alert>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {!a.analysis && (
                <Button
                  variant="secondary"
                  disabled={running}
                  loading={start.isPending && start.variables === 'analyze'}
                  onClick={() => start.mutate('analyze')}
                >
                  Check match
                </Button>
              )}
              <Button
                size="lg"
                disabled={running}
                loading={start.isPending && start.variables === 'generate'}
                onClick={() => start.mutate('generate')}
              >
                <Sparkles className="size-4" aria-hidden />
                {hasDocs ? 'Re-tailor' : 'Tailor CV & cover letter'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div
        className="mt-10 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-sunk/80 p-1"
        role="tablist"
        aria-label="Application sections"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={clsx(
              'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
              tab === t
                ? 'bg-paper text-ink shadow-[var(--shadow-soft)]'
                : 'text-muted hover:text-ink',
            )}
          >
            {TAB_LABELS[t]}
            {(t === 'cv' || t === 'letter') && hasDocs && (
              <span className="size-1.5 rounded-full bg-accent" aria-label="ready" />
            )}
          </button>
        ))}
      </div>

      <div
        className="animate-fade pt-8"
        key={tab}
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'match' && <MatchTab app={a} />}
        {tab === 'cv' && <CvTab app={a} />}
        {tab === 'letter' && <CoverLetterTab app={a} />}
        {tab === 'job' && <JobTab app={a} />}
      </div>
    </div>
  );
}
