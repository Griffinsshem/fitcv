import { Router } from 'express';
import multer from 'multer';
import { MasterProfileSchema, type ProfileResponse } from '@fitcv/shared';
import { badRequest } from '../../lib/errors';
import { currentUser } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/security';
import { extractCvText, MAX_UPLOAD_BYTES } from '../cv-import/extract';
import { enqueueJob } from '../jobs/runner';
import { assertAiQuota } from '../jobs/quota';
import { getProvider } from '../ai/provider';
import { getProfile, saveProfile } from './service';

const upload = multer({
  storage: multer.memoryStorage(), // never touches disk
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
});

export const profileRouter = Router();

profileRouter.get('/', async (req, res) => {
  const { profile, updatedAt } = await getProfile(currentUser(req).id);
  const body: ProfileResponse = { profile, updatedAt: updatedAt?.toISOString() ?? null };
  res.set('Cache-Control', 'no-store').json(body);
});

profileRouter.put('/', async (req, res) => {
  const profile = MasterProfileSchema.parse(req.body);
  const row = await saveProfile(currentUser(req).id, profile);
  const body: ProfileResponse = { profile, updatedAt: row.updatedAt.toISOString() };
  res.json(body);
});

/**
 * Upload an existing CV. Text is extracted synchronously (fast), then an AI
 * job structures it into a DRAFT profile. The draft is not saved over the
 * user's profile — the client shows it for review first.
 */
profileRouter.post('/import', aiLimiter, upload.single('file'), async (req, res) => {
  const user = currentUser(req);
  if (!req.file) throw badRequest('Attach a CV file (PDF or DOCX).');
  await getProvider(); // fail fast with 503 if AI is not configured
  await assertAiQuota(user.id);
  const cvText = await extractCvText(req.file.buffer);
  const job = await enqueueJob({ userId: user.id, kind: 'IMPORT_CV', payload: { cvText } });
  res.status(202).json({ jobId: job.id });
});
