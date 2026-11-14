import { Router } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import {
  CreateApplicationSchema,
  CvTemplateSchema,
  JobAnalysisSchema,
  profileToText,
  scoreMatch,
  TailoredCvSchema,
  UpdateApplicationSchema,
  type ApplicationDetail,
  type ApplicationSummary,
} from '@fitcv/shared';
import { env } from '../../config/env';
import { db } from '../../db/client';
import { aiJobs, applications, type Application } from '../../db/schema';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { parseId } from '../../lib/validate';
import { currentUser } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/security';
import { getProvider } from '../ai/provider';
import { assertAiQuota } from '../jobs/quota';
import { enqueueJob } from '../jobs/runner';
import { toJobView } from '../jobs/routes';
import { getProfile, profileIsUsable } from '../profile/service';

export const applicationsRouter = Router();

function toSummary(a: Application): ApplicationSummary {
  return {
    id: a.id,
    company: a.company,
    jobTitle: a.jobTitle,
    status: a.status,
    matchScore: a.matchScore,
    tailoredScore: a.tailoredScore,
    hasDocuments: !!a.tailoredCv && !!a.coverLetter,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

/** Every query is scoped by user id — this is the IDOR/BOLA guard. */
async function findOwned(userId: string, rawId: unknown): Promise<Application> {
  const id = parseId(rawId, 'Application');
  const [row] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);
  if (!row) throw notFound('Application');
  return row;
}

applicationsRouter.get('/', async (req, res) => {
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, currentUser(req).id))
    .orderBy(desc(applications.updatedAt))
    .limit(env.MAX_APPLICATIONS_PER_USER);
  res.set('Cache-Control', 'no-store').json({ applications: rows.map(toSummary) });
});

applicationsRouter.post('/', async (req, res) => {
  const user = currentUser(req);
  const input = CreateApplicationSchema.parse(req.body);
  const [existing] = await db
    .select({ n: count() })
    .from(applications)
    .where(eq(applications.userId, user.id));
  if ((existing?.n ?? 0) >= env.MAX_APPLICATIONS_PER_USER) {
    throw conflict(
      `You can keep up to ${env.MAX_APPLICATIONS_PER_USER} applications. Delete old ones first.`,
    );
  }
  const [row] = await db
    .insert(applications)
    .values({ userId: user.id, ...input })
    .returning();
  res.status(201).json({ application: toSummary(row!) });
});

applicationsRouter.get('/:id', async (req, res) => {
  const user = currentUser(req);
  const app = await findOwned(user.id, req.params.id);
  const { profile } = await getProfile(user.id);

  const analysis = app.analysis ? (JobAnalysisSchema.safeParse(app.analysis).data ?? null) : null;
  const tailoredCv = app.tailoredCv
    ? (TailoredCvSchema.safeParse(app.tailoredCv).data ?? null)
    : null;
  // Scores are recomputed live so they reflect the latest profile/CV edits.
  const matchReport = analysis ? scoreMatch(analysis.keywords, profileToText(profile)) : null;
  const tailoredReport =
    analysis && tailoredCv ? scoreMatch(analysis.keywords, profileToText(tailoredCv)) : null;

  const [latestJob] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.applicationId, app.id), eq(aiJobs.userId, user.id)))
    .orderBy(desc(aiJobs.createdAt))
    .limit(1);

  const detail: ApplicationDetail = {
    ...toSummary(app),
    matchScore: matchReport?.score ?? app.matchScore,
    tailoredScore: tailoredReport?.score ?? app.tailoredScore,
    jobUrl: app.jobUrl,
    jobDescription: app.jobDescription,
    notes: app.notes,
    template: CvTemplateSchema.safeParse(app.template).data ?? 'classic',
    analysis,
    matchReport,
    tailoredReport,
    tailoredCv,
    coverLetter: app.coverLetter,
    suggestedSkills: app.suggestedSkills ?? [],
    changeNotes: app.changeNotes ?? [],
    activeJob: latestJob ? toJobView(latestJob) : null,
  };
  res.set('Cache-Control', 'no-store').json({ application: detail });
});

applicationsRouter.patch('/:id', async (req, res) => {
  const user = currentUser(req);
  const app = await findOwned(user.id, req.params.id);
  const input = UpdateApplicationSchema.parse(req.body);
  if (Object.keys(input).length === 0) throw badRequest('Nothing to update.');

  const patch: Partial<typeof applications.$inferInsert> = { ...input };

  // A changed job description invalidates the analysis and scores.
  if (input.jobDescription !== undefined && input.jobDescription !== app.jobDescription) {
    patch.analysis = null;
    patch.matchScore = null;
    patch.tailoredScore = null;
  }
  // User edits to the tailored CV are authoritative; keep the score in sync.
  if (input.tailoredCv && app.analysis && patch.analysis !== null) {
    const analysis = JobAnalysisSchema.safeParse(app.analysis).data;
    if (analysis)
      patch.tailoredScore = scoreMatch(analysis.keywords, profileToText(input.tailoredCv)).score;
  }
  if (input.status === 'APPLIED' && !app.appliedAt) patch.appliedAt = new Date();

  const [row] = await db
    .update(applications)
    .set(patch)
    .where(and(eq(applications.id, app.id), eq(applications.userId, user.id)))
    .returning();
  res.json({ application: toSummary(row!) });
});

applicationsRouter.delete('/:id', async (req, res) => {
  const user = currentUser(req);
  const app = await findOwned(user.id, req.params.id);
  await db
    .delete(applications)
    .where(and(eq(applications.id, app.id), eq(applications.userId, user.id)));
  res.status(204).end();
});

async function startJob(kind: 'ANALYZE' | 'GENERATE', userId: string, rawId: unknown) {
  const app = await findOwned(userId, rawId);
  await getProvider(); // 503 early if AI is not configured
  if (kind === 'GENERATE') {
    const { profile } = await getProfile(userId);
    if (!profileIsUsable(profile)) {
      throw badRequest('Add your experience or projects to your profile before tailoring.');
    }
  }
  await assertAiQuota(userId);
  return enqueueJob({ userId, kind, applicationId: app.id });
}

applicationsRouter.post('/:id/analyze', aiLimiter, async (req, res) => {
  const job = await startJob('ANALYZE', currentUser(req).id, req.params.id);
  res.status(202).json({ job: toJobView(job) });
});

applicationsRouter.post('/:id/generate', aiLimiter, async (req, res) => {
  const job = await startJob('GENERATE', currentUser(req).id, req.params.id);
  res.status(202).json({ job: toJobView(job) });
});
