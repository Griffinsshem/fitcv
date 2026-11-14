import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  type IParagraphOptions,
} from 'docx';
import type { CvTemplate, TailoredCv } from '@fitcv/shared';
import { contactLine, dateRange, THEMES } from './theme';

const pt = (n: number) => Math.round(n * 2); // docx uses half-points
const RIGHT_TAB = 9900; // twips, right edge for dates on A4 with ~0.8" margins

export async function cvDocxBlob(cv: TailoredCv, template: CvTemplate): Promise<Blob> {
  const t = THEMES[template];
  const color = t.accent.replace('#', '');
  const font = 'Calibri';
  const base = pt(t.base + 0.5);

  const heading = (text: string): Paragraph =>
    new Paragraph({
      spacing: { before: t.gap * 20, after: 80 },
      border: t.rule
        ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: '9CA3AF', space: 2 } }
        : undefined,
      children: [
        new TextRun({
          text: t.headingCase === 'upper' ? text.toUpperCase() : text,
          bold: true,
          color,
          size: pt(t.heading + 0.5),
          font,
        }),
      ],
    });

  const body = (text: string, opts: Partial<IParagraphOptions> = {}) =>
    new Paragraph({ ...opts, children: [new TextRun({ text, size: base, font })] });

  const titleRow = (left: string, right: string) =>
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      spacing: { before: 100 },
      children: [
        new TextRun({ text: left, bold: true, size: base, font }),
        new TextRun({ text: right ? `\t${right}` : '', size: base, font, color: '4B5563' }),
      ],
    });

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: cv.contact.fullName, bold: true, size: pt(t.name), color, font }),
      ],
    }),
  ];
  if (cv.contact.headline) children.push(body(cv.contact.headline));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contactLine(cv).join('  •  '),
          size: pt(t.base),
          color: '4B5563',
          font,
        }),
      ],
    }),
  );

  if (cv.summary) children.push(heading('Profile'), body(cv.summary));
  if (cv.skills.length) children.push(heading('Skills'), body(cv.skills.join(' · ')));

  if (cv.experience.length) {
    children.push(heading('Experience'));
    for (const e of cv.experience) {
      children.push(
        titleRow(`${e.role} — ${e.company}`, dateRange(e.startDate, e.endDate, e.current)),
      );
      if (e.location) children.push(body(e.location));
      for (const b of e.bullets) children.push(body(b, { bullet: { level: 0 } }));
    }
  }
  if (cv.projects.length) {
    children.push(heading('Projects'));
    for (const p of cv.projects) {
      children.push(titleRow(p.name, p.link.replace(/^https?:\/\/(www\.)?/, '')));
      if (p.description) children.push(body(p.description));
      if (p.technologies.length) children.push(body(p.technologies.join(', ')));
    }
  }
  if (cv.education.length) {
    children.push(heading('Education'));
    for (const e of cv.education) {
      children.push(
        titleRow(
          `${e.qualification}${e.field ? `, ${e.field}` : ''}`,
          dateRange(e.startDate, e.endDate, false),
        ),
        body(e.institution),
      );
      if (e.details) children.push(body(e.details));
    }
  }
  if (cv.certifications.length) {
    children.push(heading('Certifications'));
    for (const c of cv.certifications)
      children.push(
        body(`${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`),
      );
  }
  if (cv.languages.length) children.push(heading('Languages'), body(cv.languages.join(' · ')));

  const doc = new Document({
    creator: 'FitCV',
    title: `${cv.contact.fullName} — CV`,
    sections: [
      {
        properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

export async function letterDocxBlob(cv: TailoredCv, letter: string): Promise<Blob> {
  const font = 'Calibri';
  const paragraphs = letter
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const doc = new Document({
    creator: 'FitCV',
    title: `${cv.contact.fullName} — Cover letter`,
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: cv.contact.fullName, bold: true, size: pt(18), font })],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: contactLine(cv).join('  •  '),
                size: pt(10),
                color: '4B5563',
                font,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
                size: pt(11),
                font,
              }),
            ],
          }),
          ...paragraphs.map(
            (p) =>
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 220, line: 300 },
                children: [new TextRun({ text: p, size: pt(11), font })],
              }),
          ),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
