'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import { APPLICATION_STATUSES, STATUS_LABELS, type ApplicationStatus } from '@fitcv/shared';
import { Alert, Badge, Button, Card, ScoreRing, Select, Spinner } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import {
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

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const app = useApplication(id);
  const update = useUpdateApplication(id);
  const start = useStartJob(id);
  const del = useDeleteApplication();
  const [tab, setTab] = useState<Tab>('match');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (app.isPending) return <Spinner />;
  if (app.error) return <Alert>{errorMessage(app.error)}</Alert>;
  const a = app.data;

  const job = a.activeJob;
  const running = job?.status === 'PENDING' || job?.status === 'RUNNING';
  const failed = job?.status === 'FAILED';
  const hasDocs = !!a.tailoredCv && !!a.coverLetter;

  return (
    <div>
      <Link
        href="/app"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Applications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{a.jobTitle}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-ink-soft">
            {a.company}
            {a.jobUrl && (
              <a
                href={a.jobUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-muted hover:text-accent"
                aria-label="Open job posting"
              >
                <ExternalLink className="size-4" />
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
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <ScoreRing score={a.matchScore} label="Your profile" />
            <ArrowRight className="size-4 text-muted" aria-hidden />
            <ScoreRing score={a.tailoredScore} label="Tailored CV" />
          </div>
          <div className="min-w-56 flex-1">
            {running ? (
              <div className="space-y-1">
                <Spinner
                  label={
                    job?.kind === 'ANALYZE'
                      ? 'Reading the job description…'
                      : 'Tailoring your CV and writing your cover letter…'
                  }
                />
                <p className="text-xs text-muted">
                  This usually takes 20–60 seconds. You can leave this page; it keeps working.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  {hasDocs
                    ? 'Your tailored CV and cover letter are ready. Review, edit and download them below.'
                    : a.analysis
                      ? 'Match checked. Tailor your CV to close the gaps and generate a cover letter.'
                      : 'Check your match, or go straight to a tailored CV and cover letter.'}
                </p>
                {failed && job?.error && (
                  <div className="mt-2">
                    <Alert>{job.error}</Alert>
                  </div>
                )}
                {start.error && (
                  <div className="mt-2">
                    <Alert>{errorMessage(start.error)}</Alert>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
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
              disabled={running}
              loading={start.isPending && start.variables === 'generate'}
              onClick={() => start.mutate('generate')}
            >
              <Sparkles className="size-4" aria-hidden />
              {hasDocs ? 'Re-tailor' : 'Tailor CV & cover letter'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-8 border-b border-line" role="tablist" aria-label="Application sections">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              onClick={() => setTab(t)}
              className={clsx(
                'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium',
                tab === t
                  ? 'border-accent text-ink'
                  : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {TAB_LABELS[t]}
              {t === 'cv' && hasDocs && (
                <Badge tone="accent" className="ml-2">
                  Ready
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'match' && <MatchTab app={a} />}
        {tab === 'cv' && <CvTab app={a} />}
        {tab === 'letter' && <CoverLetterTab app={a} />}
        {tab === 'job' && <JobTab app={a} />}
      </div>
    </div>
  );
}
