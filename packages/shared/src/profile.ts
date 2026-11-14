import { z } from 'zod';

/**
 * The "master profile" is the single source of truth about a user's career.
 * Every tailored CV is derived from it, so the AI can only reword/reorder
 * facts that exist here — it never invents experience.
 *
 * All strings are length-capped: this bounds storage, AI prompt cost, and
 * the blast radius of malicious input.
 */

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).optional().default('');
const id = z.string().trim().min(1).max(64);
const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must be an http(s) URL')
  .optional()
  .default('');

export const ContactSchema = z.object({
  fullName: optionalText(120),
  headline: optionalText(160),
  email: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
    .optional()
    .default(''),
  phone: optionalText(40),
  location: optionalText(120),
  linkedin: url,
  github: url,
  website: url,
});

export const ExperienceSchema = z.object({
  id,
  role: text(120),
  company: text(120),
  location: optionalText(120),
  startDate: optionalText(20),
  endDate: optionalText(20),
  current: z.boolean().optional().default(false),
  bullets: z.array(text(400)).max(15).default([]),
});

export const EducationSchema = z.object({
  id,
  institution: text(160),
  qualification: text(160),
  field: optionalText(160),
  startDate: optionalText(20),
  endDate: optionalText(20),
  details: optionalText(600),
});

export const ProjectSchema = z.object({
  id,
  name: text(120),
  link: url,
  description: optionalText(600),
  technologies: z.array(text(60)).max(30).default([]),
});

export const CertificationSchema = z.object({
  id,
  name: text(160),
  issuer: optionalText(160),
  date: optionalText(20),
});

export const MasterProfileSchema = z.object({
  contact: ContactSchema.default({
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  }),
  summary: optionalText(2000),
  skills: z.array(text(60)).max(100).default([]),
  experience: z.array(ExperienceSchema).max(30).default([]),
  education: z.array(EducationSchema).max(15).default([]),
  projects: z.array(ProjectSchema).max(30).default([]),
  certifications: z.array(CertificationSchema).max(30).default([]),
  languages: z.array(text(60)).max(20).default([]),
});

export type Contact = z.infer<typeof ContactSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type MasterProfile = z.infer<typeof MasterProfileSchema>;

export const emptyProfile = (): MasterProfile => MasterProfileSchema.parse({});

/** Flatten a profile to plain text — used for keyword matching and AI context. */
export function profileToText(p: MasterProfile): string {
  const parts: string[] = [
    p.contact.headline,
    p.summary,
    p.skills.join(', '),
    ...p.experience.flatMap((e) => [e.role, e.company, ...e.bullets]),
    ...p.education.flatMap((e) => [e.qualification, e.field, e.institution, e.details]),
    ...p.projects.flatMap((pr) => [pr.name, pr.description, pr.technologies.join(', ')]),
    ...p.certifications.map((c) => `${c.name} ${c.issuer}`),
    p.languages.join(', '),
  ];
  return parts.filter(Boolean).join('\n');
}
