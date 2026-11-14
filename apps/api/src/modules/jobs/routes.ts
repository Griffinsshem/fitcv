import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { MasterProfileSchema, type JobView } from '@fitcv/shared';
import { db } from '../../db/client';
import { aiJobs, type AiJob } from '../../db/schema';
import { notFound } from '../../lib/errors';
import { parseId } from '../../lib/validate';
import { currentUser } from '../../middleware/auth';

export function toJobView(job: AiJob): JobView {
  const view: JobView = {
    id: job.id,
    kind: job.kind,
    status: job.status,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
  if (job.kind === 'IMPORT_CV' && job.status === 'SUCCEEDED') {
    view.result = MasterProfileSchema.safeParse(job.result).data ?? null;
  }
  return view;
}

export const jobsRouter = Router();

jobsRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params.id, 'Job');
  const [job] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, id), eq(aiJobs.userId, currentUser(req).id)))
    .limit(1);
  if (!job) throw notFound('Job');
  res.set('Cache-Control', 'no-store').json({ job: toJobView(job) });
});
