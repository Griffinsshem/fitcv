import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm';
import {
  GenerationResultSchema,
  JobAnalysisSchema,
  MasterProfileSchema,
  profileToText,
  scoreMatch,
  type JobKind,
} from '@fitcv/shared';
import { env } from '../../config/env';
import { db } from '../../db/client';
import { aiJobs, applications, sessions, type AiJob } from '../../db/schema';
import { AppError, conflict } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { Semaphore } from '../../lib/semaphore';
import { enforceIntegrity } from '../ai/integrity';
import { analyzeJobPrompt, generatePrompt, importCvPrompt } from '../ai/prompts';
import { generateStructured, type AiUsage } from '../ai/provider';
import { getProfile, profileIsUsable } from '../profile/service';

/**
 * In-process job runner. Jobs are persisted rows, so the client can poll and
 * state survives a crash (stale jobs are marked failed on recovery).
 *
 * Scaling path: replace `schedule()` with a durable queue (pg-boss on the same
 * Postgres, or BullMQ+Redis) and run handlers in a worker service. The handler
 * functions below are already queue-agnostic.
 */

const semaphore = new Semaphore(env.AI_MAX_CONCURRENCY);

type Payload = { cvText?: string };

export async function enqueueJob(input: {
  userId: string;
  kind: JobKind;
  applicationId?: string;
  payload?: Payload;
}): Promise<AiJob> {
  let job: AiJob | undefined;
  try {
    [job] = await db
      .insert(aiJobs)
      .values({
        userId: input.userId,
        kind: input.kind,
        applicationId: input.applicationId ?? null,
      })
      .returning();
  } catch (err) {
    // Partial unique index: one active job per application (idempotency).
    if (
      (err as { code?: string }).code === '23505' ||
      (err as { cause?: { code?: string } }).cause?.code === '23505'
    ) {
      throw conflict('A generation is already running for this application.');
    }
    throw err;
  }
  schedule(job!, input.payload ?? {});
  return job!;
}

function schedule(job: AiJob, payload: Payload) {
  // Payload (e.g. CV text) lives only in memory — it is never persisted.
  setImmediate(() => {
    void semaphore.run(() => execute(job, payload));
  });
}

async function execute(job: AiJob, payload: Payload) {
  const log = logger.child({ jobId: job.id, kind: job.kind, userId: job.userId });
  const started = Date.now();
  await db
    .update(aiJobs)
    .set({ status: 'RUNNING', startedAt: new Date() })
    .where(eq(aiJobs.id, job.id));

  try {
    const { usage, result } = await handlers[job.kind](job, payload);
    await db
      .update(aiJobs)
      .set({
        status: 'SUCCEEDED',
        finishedAt: new Date(),
        result: result ?? null,
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      })
      .where(eq(aiJobs.id, job.id));
    log.info({ ms: Date.now() - started, ...usage }, 'ai job succeeded');
  } catch (err) {
    const safe =
      err instanceof AppError ? err.message : 'The AI service failed to respond. Please try again.';
    log.error({ err, ms: Date.now() - started }, 'ai job failed');
    await db
      .update(aiJobs)
      .set({ status: 'FAILED', finishedAt: new Date(), error: safe })
      .where(eq(aiJobs.id, job.id))
      .catch((e) => log.error({ err: e }, 'failed to mark job failed'));
  }
}

type HandlerResult = { usage: AiUsage; result?: AiJob['result'] };
type Handler = (job: AiJob, payload: Payload) => Promise<HandlerResult>;

async function loadApplication(job: AiJob) {
  if (!job.applicationId) throw new AppError(400, 'BAD_JOB', 'Job has no application.');
  const [app] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, job.applicationId), eq(applications.userId, job.userId)))
    .limit(1);
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
  return app;
}

async function analyze(jobTitle: string, company: string, jd: string) {
  const p = analyzeJobPrompt(jobTitle, company, jd);
  return generateStructured({
    ...p,
    schema: JobAnalysisSchema,
    name: 'submit_job_analysis',
    maxTokens: 3000,
  });
}

const handlers: Record<JobKind, Handler> = {
  async IMPORT_CV(_job, payload) {
    if (!payload.cvText) throw new AppError(400, 'BAD_JOB', 'Missing CV text.');
    const p = importCvPrompt(payload.cvText);
    const { data, usage } = await generateStructured({
      ...p,
      schema: MasterProfileSchema,
      name: 'submit_profile',
      maxTokens: 8000,
    });
    return { usage, result: data };
  },

  async ANALYZE(job) {
    const app = await loadApplication(job);
    const { data: analysis, usage } = await analyze(app.jobTitle, app.company, app.jobDescription);
    const { profile } = await getProfile(job.userId);
    const report = scoreMatch(analysis.keywords, profileToText(profile));
    await db
      .update(applications)
      .set({ analysis, matchScore: report.score })
      .where(eq(applications.id, app.id));
    return { usage };
  },

  async GENERATE(job) {
    const app = await loadApplication(job);
    const { profile } = await getProfile(job.userId);
    if (!profileIsUsable(profile)) {
      throw new AppError(
        400,
        'PROFILE_INCOMPLETE',
        'Add your experience or projects to your profile first.',
      );
    }

    let analysis = app.analysis ? JobAnalysisSchema.safeParse(app.analysis).data : undefined;
    let usage: AiUsage = { provider: '', model: '', inputTokens: 0, outputTokens: 0 };
    if (!analysis) {
      const r = await analyze(app.jobTitle, app.company, app.jobDescription);
      analysis = r.data;
      usage = r.usage;
    }
    const report = scoreMatch(analysis.keywords, profileToText(profile));

    const p = generatePrompt({
      profile,
      jobTitle: app.jobTitle,
      company: app.company,
      jobDescription: app.jobDescription,
      analysis,
      report,
    });
    const gen = await generateStructured({
      ...p,
      schema: GenerationResultSchema,
      name: 'submit_tailored_application',
      maxTokens: 10000,
    });

    const { cv, removed } = enforceIntegrity(profile, gen.data.cv, analysis.keywords);
    const tailored = scoreMatch(analysis.keywords, profileToText(cv));
    const notes = [...gen.data.changeNotes];
    if (removed.length)
      notes.push(`Safety check removed ${removed.length} item(s) not backed by your profile.`);

    await db
      .update(applications)
      .set({
        analysis,
        matchScore: report.score,
        tailoredCv: cv,
        tailoredScore: tailored.score,
        coverLetter: gen.data.coverLetter,
        suggestedSkills: gen.data.suggestedSkills,
        changeNotes: notes,
      })
      .where(eq(applications.id, app.id));

    return {
      usage: {
        provider: gen.usage.provider,
        model: gen.usage.model,
        inputTokens: usage.inputTokens + gen.usage.inputTokens,
        outputTokens: usage.outputTokens + gen.usage.outputTokens,
      },
    };
  },
};

/** Mark jobs orphaned by a restart/crash as failed so the UI can offer a retry. */
export async function recoverStaleJobs(olderThanMs = env.AI_TIMEOUT_MS * 4) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = await db
    .update(aiJobs)
    .set({ status: 'FAILED', finishedAt: new Date(), error: 'Interrupted. Please try again.' })
    .where(and(inArray(aiJobs.status, ['PENDING', 'RUNNING']), lt(aiJobs.createdAt, cutoff)))
    .returning({ id: aiJobs.id });
  if (rows.length) logger.warn({ count: rows.length }, 'recovered stale ai jobs');
}

/** Data minimisation: drop imported-CV drafts and expired sessions. */
export async function housekeeping() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db
    .update(aiJobs)
    .set({ result: null })
    .where(and(isNotNull(aiJobs.result), lt(aiJobs.createdAt, weekAgo)));
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await recoverStaleJobs();
}
