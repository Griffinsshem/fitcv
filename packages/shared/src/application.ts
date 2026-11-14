import { z } from 'zod';
import { MasterProfileSchema } from './profile';

export const APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const;
export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export const CV_TEMPLATES = ['classic', 'modern', 'compact'] as const;
export const CvTemplateSchema = z.enum(CV_TEMPLATES);
export type CvTemplate = z.infer<typeof CvTemplateSchema>;

export const CreateApplicationSchema = z.object({
  company: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().min(1).max(160),
  jobUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must be an http(s) URL')
    .optional()
    .default(''),
  jobDescription: z
    .string()
    .trim()
    .min(80, 'Paste the full job description (at least 80 characters)')
    .max(20000),
});
export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;

// ---- AI analysis: keywords extracted from the job description ----
export const KEYWORD_CATEGORIES = [
  'hard_skill',
  'tool',
  'soft_skill',
  'qualification',
  'domain',
] as const;

export const JobKeywordSchema = z.object({
  term: z.string().trim().min(1).max(60),
  category: z.enum(KEYWORD_CATEGORIES),
  importance: z.enum(['required', 'preferred']),
  synonyms: z.array(z.string().trim().min(1).max(60)).max(6).default([]),
});
export type JobKeyword = z.infer<typeof JobKeywordSchema>;

export const JobAnalysisSchema = z.object({
  seniority: z.string().trim().max(40).default(''),
  summary: z.string().trim().max(600).default(''),
  keywords: z.array(JobKeywordSchema).min(1).max(40),
});
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;

// ---- Deterministic match report (computed on the server, reproducible) ----
export const KeywordResultSchema = JobKeywordSchema.extend({
  matched: z.boolean(),
  matchedAs: z.string().nullable(),
});
export type KeywordResult = z.infer<typeof KeywordResultSchema>;

export const MatchReportSchema = z.object({
  score: z.number().int().min(0).max(100),
  requiredCoverage: z.number().min(0).max(1),
  preferredCoverage: z.number().min(0).max(1),
  keywords: z.array(KeywordResultSchema),
});
export type MatchReport = z.infer<typeof MatchReportSchema>;

// ---- Tailored output ----
export const SuggestedSkillSchema = z.object({
  skill: z.string().trim().min(1).max(60),
  reason: z.string().trim().max(300),
  /** How to close the gap honestly: course, small project, etc. */
  howToGain: z.string().trim().max(300).default(''),
});
export type SuggestedSkill = z.infer<typeof SuggestedSkillSchema>;

export const TailoredCvSchema = MasterProfileSchema;
export type TailoredCv = z.infer<typeof TailoredCvSchema>;

export const GenerationResultSchema = z.object({
  cv: TailoredCvSchema,
  coverLetter: z.string().trim().min(50).max(6000),
  suggestedSkills: z.array(SuggestedSkillSchema).max(12).default([]),
  changeNotes: z.array(z.string().trim().max(300)).max(12).default([]),
});
export type GenerationResult = z.infer<typeof GenerationResultSchema>;

export const UpdateApplicationSchema = z
  .object({
    company: z.string().trim().min(1).max(120),
    jobTitle: z.string().trim().min(1).max(160),
    jobUrl: CreateApplicationSchema.shape.jobUrl,
    jobDescription: CreateApplicationSchema.shape.jobDescription,
    status: ApplicationStatusSchema,
    notes: z.string().max(5000),
    template: CvTemplateSchema,
    tailoredCv: TailoredCvSchema,
    coverLetter: z.string().max(6000),
  })
  .partial()
  .strict();
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;

export const JOB_KINDS = ['IMPORT_CV', 'ANALYZE', 'GENERATE'] as const;
export type JobKind = (typeof JOB_KINDS)[number];
export const JOB_STATUSES = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
