import type { CvTemplate, TailoredCv } from '@fitcv/shared';
import { contactLine, dateRange, THEMES } from '@/lib/export/theme';

/** On-screen "paper" preview that mirrors the PDF template. */
export function CvPreview({ cv, template }: { cv: TailoredCv; template: CvTemplate }) {
  const t = THEMES[template];
  const scale = 1.33; // pt -> px
  const H = ({ children }: { children: string }) => (
    <h3
      className="mb-1.5 pb-0.5 font-bold"
      style={{
        color: t.accent,
        fontSize: t.heading * scale,
        letterSpacing: t.headingCase === 'upper' ? '0.06em' : undefined,
        borderBottom: t.rule ? '1px solid #9ca3af' : undefined,
        textTransform: t.headingCase === 'upper' ? 'uppercase' : undefined,
      }}
    >
      {children}
    </h3>
  );
  const section = { marginTop: t.gap * scale };

  return (
    <article
      className="mx-auto w-full max-w-[794px] bg-white text-[#1f2937] shadow-sm ring-1 ring-line"
      style={{
        padding: t.margin * scale,
        fontSize: t.base * scale,
        lineHeight: 1.45,
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
      aria-label="CV preview"
    >
      <h2 className="font-bold leading-tight" style={{ color: t.accent, fontSize: t.name * scale }}>
        {cv.contact.fullName || 'Your Name'}
      </h2>
      {cv.contact.headline && (
        <p style={{ fontSize: (t.base + 1.5) * scale }} className="text-[#374151]">
          {cv.contact.headline}
        </p>
      )}
      <p className="mt-1 text-[#4b5563]" style={{ fontSize: (t.base - 0.5) * scale }}>
        {contactLine(cv).join('  •  ')}
      </p>

      {cv.summary && (
        <section style={section}>
          <H>Profile</H>
          <p>{cv.summary}</p>
        </section>
      )}
      {cv.skills.length > 0 && (
        <section style={section}>
          <H>Skills</H>
          <p>{cv.skills.join(' · ')}</p>
        </section>
      )}
      {cv.experience.length > 0 && (
        <section style={section}>
          <H>Experience</H>
          {cv.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: t.gap * 0.55 * scale }}>
              <div className="flex flex-wrap justify-between gap-x-4">
                <strong>
                  {e.role} — {e.company}
                </strong>
                <span className="text-[#4b5563]">
                  {dateRange(e.startDate, e.endDate, e.current)}
                </span>
              </div>
              {e.location && <p className="text-[#4b5563]">{e.location}</p>}
              <ul className="mt-0.5 list-disc pl-5">
                {e.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      {cv.projects.length > 0 && (
        <section style={section}>
          <H>Projects</H>
          {cv.projects.map((p) => (
            <div key={p.id} style={{ marginBottom: t.gap * 0.55 * scale }}>
              <div className="flex flex-wrap justify-between gap-x-4">
                <strong>{p.name}</strong>
                {p.link && (
                  <span className="text-[#4b5563]">
                    {p.link.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                )}
              </div>
              {p.description && <p>{p.description}</p>}
              {p.technologies.length > 0 && (
                <p className="text-[#4b5563]">{p.technologies.join(', ')}</p>
              )}
            </div>
          ))}
        </section>
      )}
      {cv.education.length > 0 && (
        <section style={section}>
          <H>Education</H>
          {cv.education.map((e) => (
            <div key={e.id} style={{ marginBottom: t.gap * 0.55 * scale }}>
              <div className="flex flex-wrap justify-between gap-x-4">
                <strong>
                  {e.qualification}
                  {e.field ? `, ${e.field}` : ''}
                </strong>
                <span className="text-[#4b5563]">{dateRange(e.startDate, e.endDate, false)}</span>
              </div>
              <p className="text-[#4b5563]">{e.institution}</p>
              {e.details && <p>{e.details}</p>}
            </div>
          ))}
        </section>
      )}
      {cv.certifications.length > 0 && (
        <section style={section}>
          <H>Certifications</H>
          {cv.certifications.map((c) => (
            <p key={c.id}>
              {c.name}
              {c.issuer ? ` — ${c.issuer}` : ''}
              {c.date ? ` (${c.date})` : ''}
            </p>
          ))}
        </section>
      )}
      {cv.languages.length > 0 && (
        <section style={section}>
          <H>Languages</H>
          <p>{cv.languages.join(' · ')}</p>
        </section>
      )}
    </article>
  );
}
