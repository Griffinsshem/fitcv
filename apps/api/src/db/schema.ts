import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  GenerationResult,
  JobAnalysis,
  MasterProfile,
  SuggestedSkill,
  TailoredCv,
} from '@fitcv/shared';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const planEnum = pgEnum('plan', ['FREE', 'PRO']);
export const applicationStatusEnum = pgEnum('application_status', [
  'SAVED',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]);
export const jobKindEnum = pgEnum('ai_job_kind', ['IMPORT_CV', 'ANALYZE', 'GENERATE']);
export const jobStatusEnum = pgEnum('ai_job_status', ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    googleSub: text('google_sub').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull().default(''),
    avatarUrl: text('avatar_url'),
    plan: planEnum('plan').notNull().default('FREE'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_google_sub_uq').on(t.googleSub),
    uniqueIndex('users_email_uq').on(t.email),
    check('users_email_lower_ck', sql`${t.email} = lower(${t.email})`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of the cookie token. The raw token is never stored. */
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    userAgent: text('user_agent').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_uq').on(t.tokenHash),
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
);

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<MasterProfile>().notNull(),
  ...timestamps,
});

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    jobTitle: text('job_title').notNull(),
    jobUrl: text('job_url').notNull().default(''),
    jobDescription: text('job_description').notNull(),
    status: applicationStatusEnum('status').notNull().default('SAVED'),
    notes: text('notes').notNull().default(''),
    template: text('template').notNull().default('classic'),
    analysis: jsonb('analysis').$type<JobAnalysis>(),
    matchScore: smallint('match_score'),
    tailoredCv: jsonb('tailored_cv').$type<TailoredCv>(),
    tailoredScore: smallint('tailored_score'),
    coverLetter: text('cover_letter'),
    suggestedSkills: jsonb('suggested_skills').$type<SuggestedSkill[]>().notNull().default([]),
    changeNotes: jsonb('change_notes').$type<string[]>().notNull().default([]),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('applications_user_updated_idx').on(t.userId, t.updatedAt.desc()),
    check('applications_match_score_ck', sql`${t.matchScore} between 0 and 100`),
    check('applications_tailored_score_ck', sql`${t.tailoredScore} between 0 and 100`),
  ],
);

export const aiJobs = pgTable(
  'ai_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').references(() => applications.id, {
      onDelete: 'cascade',
    }),
    kind: jobKindEnum('kind').notNull(),
    status: jobStatusEnum('status').notNull().default('PENDING'),
    error: text('error'),
    /** Only IMPORT_CV stores a result (a draft profile); purged after 7 days. */
    result: jsonb('result').$type<MasterProfile | GenerationResult | null>(),
    provider: text('provider'),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    index('ai_jobs_user_created_idx').on(t.userId, t.createdAt),
    index('ai_jobs_application_idx').on(t.applicationId),
    // At most one in-flight job per application, enforced by the database.
    uniqueIndex('ai_jobs_one_active_per_application_uq')
      .on(t.applicationId)
      .where(sql`${t.status} in ('PENDING', 'RUNNING') and ${t.applicationId} is not null`),
  ],
);

export type User = typeof users.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type AiJob = typeof aiJobs.$inferSelect;
