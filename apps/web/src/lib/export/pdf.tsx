import { Document, Link, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { CvTemplate, TailoredCv } from '@fitcv/shared';
import { contactLine, dateRange, THEMES, type CvTheme } from './theme';

function makeStyles(t: CvTheme) {
  return StyleSheet.create({
    page: {
      padding: t.margin,
      fontFamily: 'Helvetica',
      fontSize: t.base,
      color: '#1f2937',
      lineHeight: 1.4,
    },
    name: { fontFamily: 'Helvetica-Bold', fontSize: t.name, color: t.accent, marginBottom: 2 },
    headline: { fontSize: t.base + 1.5, color: '#374151', marginBottom: 4 },
    contact: { fontSize: t.base - 0.5, color: '#4b5563' },
    section: { marginTop: t.gap },
    heading: {
      fontFamily: 'Helvetica-Bold',
      fontSize: t.heading,
      color: t.accent,
      letterSpacing: t.headingCase === 'upper' ? 0.8 : 0,
      paddingBottom: 2,
      marginBottom: 5,
      ...(t.rule ? { borderBottomWidth: 0.75, borderBottomColor: '#9ca3af' } : {}),
    },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    bold: { fontFamily: 'Helvetica-Bold' },
    muted: { color: '#4b5563' },
    item: { marginBottom: t.gap * 0.55 },
    bullet: { flexDirection: 'row', marginTop: 1.5 },
    dot: { width: 10 },
    bulletText: { flex: 1 },
    letter: { fontSize: 11, lineHeight: 1.6 },
    para: { marginBottom: 10 },
  });
}

const heading = (t: CvTheme, s: string) => (t.headingCase === 'upper' ? s.toUpperCase() : s);

export function CvPdf({ cv, template }: { cv: TailoredCv; template: CvTemplate }) {
  const t = THEMES[template];
  const s = makeStyles(t);
  return (
    <Document title={`${cv.contact.fullName} — CV`} author={cv.contact.fullName} creator="FitCV">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{cv.contact.fullName || 'Your Name'}</Text>
        {cv.contact.headline ? <Text style={s.headline}>{cv.contact.headline}</Text> : null}
        <Text style={s.contact}>{contactLine(cv).join('  •  ')}</Text>

        {cv.summary ? (
          <View style={s.section}>
            <Text style={s.heading}>{heading(t, 'Profile')}</Text>
            <Text>{cv.summary}</Text>
          </View>
        ) : null}

        {cv.skills.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>{heading(t, 'Skills')}</Text>
            <Text>{cv.skills.join(' · ')}</Text>
          </View>
        )}

        {cv.experience.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>{heading(t, 'Experience')}</Text>
            {cv.experience.map((e) => (
              <View key={e.id} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.bold}>
                    {e.role} — {e.company}
                  </Text>
                  <Text style={s.muted}>{dateRange(e.startDate, e.endDate, e.current)}</Text>
                </View>
                {e.location ? <Text style={s.muted}>{e.location}</Text> : null}
                {e.bullets.map((b, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {cv.projects.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>{heading(t, 'Projects')}</Text>
            {cv.projects.map((p) => (
              <View key={p.id} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.bold}>{p.name}</Text>
                  {p.link ? (
                    <Link src={p.link} style={s.muted}>
                      {p.link.replace(/^https?:\/\/(www\.)?/, '')}
                    </Link>
                  ) : null}
                </View>
                {p.description ? <Text>{p.description}</Text> : null}
                {p.technologies.length > 0 && (
                  <Text style={s.muted}>{p.technologies.join(', ')}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {cv.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>{heading(t, 'Education')}</Text>
            {cv.education.map((e) => (
              <View key={e.id} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.bold}>
                    {e.qualification}
                    {e.field ? `, ${e.field}` : ''}
                  </Text>
                  <Text style={s.muted}>{dateRange(e.startDate, e.endDate, false)}</Text>
                </View>
                <Text style={s.muted}>{e.institution}</Text>
                {e.details ? <Text>{e.details}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {cv.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>{heading(t, 'Certifications')}</Text>
            {cv.certifications.map((c) => (
              <Text key={c.id}>
                {c.name}
                {c.issuer ? ` — ${c.issuer}` : ''}
                {c.date ? ` (${c.date})` : ''}
              </Text>
            ))}
          </View>
        )}

        {cv.languages.length > 0 && (
          <View style={s.section}>
            <Text style={s.heading}>{heading(t, 'Languages')}</Text>
            <Text>{cv.languages.join(' · ')}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

export function LetterPdf({
  cv,
  letter,
  template,
}: {
  cv: TailoredCv;
  letter: string;
  template: CvTemplate;
}) {
  const t = THEMES[template];
  const s = makeStyles(t);
  const paragraphs = letter
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <Document
      title={`${cv.contact.fullName} — Cover letter`}
      author={cv.contact.fullName}
      creator="FitCV"
    >
      <Page size="A4" style={{ ...s.page, padding: 56 }}>
        <Text style={s.name}>{cv.contact.fullName}</Text>
        <Text style={[s.contact, { marginBottom: 28 }]}>{contactLine(cv).join('  •  ')}</Text>
        <Text style={[s.muted, { marginBottom: 18 }]}>
          {new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={[s.letter, s.para]}>
            {p}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export async function cvPdfBlob(cv: TailoredCv, template: CvTemplate) {
  return pdf(<CvPdf cv={cv} template={template} />).toBlob();
}

export async function letterPdfBlob(cv: TailoredCv, letter: string, template: CvTemplate) {
  return pdf(<LetterPdf cv={cv} letter={letter} template={template} />).toBlob();
}
