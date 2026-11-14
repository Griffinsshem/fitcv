import {
  type JobKeyword,
  containsTerm,
  normalize,
  profileToText,
  type MasterProfile,
  type TailoredCv,
} from '@fitcv/shared';

/**
 * Anti-fabrication guard, enforced in code (not trusted to the model):
 *  - contact details always come from the master profile
 *  - experience/education/certification entries must exist in the master
 *    profile (matched by id); identity fields (company, role, dates, school,
 *    qualification) are overwritten with the master values
 *  - projects must exist in the master profile
 *  - skills must be evidenced somewhere in the master profile
 *
 * Returns the cleaned CV plus a list of what was removed (for transparency).
 */
export function enforceIntegrity(
  master: MasterProfile,
  cv: TailoredCv,
  keywords: JobKeyword[] = [],
): { cv: TailoredCv; removed: string[] } {
  const removed: string[] = [];
  const masterText = normalize(profileToText(master));

  // Terminology mirroring: if the profile says "Postgres" and the job says
  // "PostgreSQL", the job's spelling is allowed because it is the same skill.
  const aliases = new Set<string>();
  for (const k of keywords) {
    const group = [k.term, ...k.synonyms];
    if (group.some((g) => containsTerm(masterText, g)))
      group.forEach((g) => aliases.add(normalize(g)));
  }
  const evidenced = (term: string) =>
    containsTerm(masterText, term) || aliases.has(normalize(term));

  const expById = new Map(master.experience.map((e) => [e.id, e]));
  const experience = cv.experience.flatMap((e) => {
    const m = expById.get(e.id);
    if (!m) {
      removed.push(`Experience "${e.role} at ${e.company}" (not in your profile)`);
      return [];
    }
    return [
      {
        ...e,
        role: m.role,
        company: m.company,
        location: m.location,
        startDate: m.startDate,
        endDate: m.endDate,
        current: m.current,
      },
    ];
  });

  const eduById = new Map(master.education.map((e) => [e.id, e]));
  const education = cv.education.flatMap((e) => {
    const m = eduById.get(e.id);
    if (!m) {
      removed.push(`Education "${e.qualification}" (not in your profile)`);
      return [];
    }
    return [{ ...m, details: e.details }];
  });

  const certById = new Map(master.certifications.map((c) => [c.id, c]));
  const certifications = cv.certifications.flatMap((c) => {
    const m = certById.get(c.id);
    if (!m) {
      removed.push(`Certification "${c.name}" (not in your profile)`);
      return [];
    }
    return [m];
  });

  const projById = new Map(master.projects.map((p) => [p.id, p]));
  const projects = cv.projects.flatMap((p) => {
    const m = projById.get(p.id);
    if (!m) {
      removed.push(`Project "${p.name}" (not in your profile)`);
      return [];
    }
    return [{ ...p, name: m.name, link: m.link, technologies: p.technologies.filter(evidenced) }];
  });

  const seen = new Set<string>();
  const skills = cv.skills.filter((s) => {
    const key = normalize(s);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    if (evidenced(s)) return true;
    removed.push(`Skill "${s}" (not evidenced in your profile)`);
    return false;
  });

  const languages = cv.languages.filter((l) => containsTerm(masterText, l));

  return {
    cv: {
      ...cv,
      contact: master.contact,
      experience,
      education,
      certifications,
      projects,
      skills,
      languages,
    },
    removed,
  };
}
