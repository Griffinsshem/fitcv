import { describe, expect, it } from 'vitest';
import { MasterProfileSchema } from '@fitcv/shared';
import { enforceIntegrity } from '../src/modules/ai/integrity';

const master = MasterProfileSchema.parse({
  contact: { fullName: 'Griffins Shem', email: 'g@example.com' },
  summary: 'Full-stack developer building TypeScript and Node.js apps on PostgreSQL.',
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
  experience: [
    {
      id: 'exp-1',
      role: 'Software Engineer',
      company: 'Acme',
      startDate: '2024',
      endDate: '',
      current: true,
      bullets: ['Built REST APIs with Express and Docker'],
    },
  ],
  education: [
    { id: 'edu-1', institution: 'Moringa School', qualification: 'Software Engineering' },
  ],
});

describe('enforceIntegrity', () => {
  it('removes fabricated experience and restores identity fields', () => {
    const cv = MasterProfileSchema.parse({
      ...master,
      contact: { ...master.contact, fullName: 'Someone Else' },
      experience: [
        {
          ...master.experience[0],
          role: 'Principal Engineer',
          company: 'Google',
          startDate: '2015',
        },
        { id: 'exp-99', role: 'CTO', company: 'Fake Inc', bullets: [] },
      ],
    });
    const { cv: out, removed } = enforceIntegrity(master, cv);
    expect(out.contact.fullName).toBe('Griffins Shem');
    expect(out.experience).toHaveLength(1);
    expect(out.experience[0]).toMatchObject({
      role: 'Software Engineer',
      company: 'Acme',
      startDate: '2024',
    });
    expect(removed.some((r) => r.includes('Fake Inc'))).toBe(true);
  });

  it('keeps skills evidenced anywhere in the profile and drops invented ones', () => {
    const cv = MasterProfileSchema.parse({
      ...master,
      skills: ['Docker', 'Kubernetes', 'TypeScript', 'typescript'],
    });
    const { cv: out, removed } = enforceIntegrity(master, cv);
    expect(out.skills).toEqual(['Docker', 'TypeScript']); // Docker is in a bullet; dupes removed
    expect(removed).toContain('Skill "Kubernetes" (not evidenced in your profile)');
  });

  it('drops education that is not in the profile', () => {
    const cv = MasterProfileSchema.parse({
      ...master,
      education: [...master.education, { id: 'edu-2', institution: 'MIT', qualification: 'PhD' }],
    });
    expect(enforceIntegrity(master, cv).cv.education).toHaveLength(1);
  });

  it("allows the job's spelling of a skill the profile has under a synonym", () => {
    const m = MasterProfileSchema.parse({ ...master, skills: ['Postgres'], summary: '' });
    const cv = MasterProfileSchema.parse({ ...m, skills: ['PostgreSQL'] });
    const kw = [
      {
        term: 'PostgreSQL',
        synonyms: ['Postgres'],
        category: 'tool' as const,
        importance: 'required' as const,
      },
    ];
    expect(enforceIntegrity(m, cv, kw).cv.skills).toEqual(['PostgreSQL']);
    expect(enforceIntegrity(m, cv).cv.skills).toEqual([]);
  });
});
