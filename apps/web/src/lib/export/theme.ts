import type { CvTemplate, TailoredCv } from '@fitcv/shared';

/**
 * Template themes shared by the HTML preview, PDF and DOCX renderers.
 * All three are single-column with standard fonts and real text, the layout
 * applicant tracking systems parse most reliably.
 */
export interface CvTheme {
  label: string;
  description: string;
  accent: string;
  base: number; // body font size (pt)
  name: number;
  heading: number;
  gap: number; // section spacing (pt)
  margin: number; // page margin (pt)
  headingCase: 'upper' | 'title';
  rule: boolean;
}

export const THEMES: Record<CvTemplate, CvTheme> = {
  classic: {
    label: 'Classic',
    description: 'Timeless black and white with section rules.',
    accent: '#111827',
    base: 10,
    name: 20,
    heading: 10.5,
    gap: 12,
    margin: 44,
    headingCase: 'upper',
    rule: true,
  },
  modern: {
    label: 'Modern',
    description: 'Teal accents, airy spacing.',
    accent: '#0f766e',
    base: 10,
    name: 24,
    heading: 11.5,
    gap: 14,
    margin: 46,
    headingCase: 'title',
    rule: false,
  },
  compact: {
    label: 'Compact',
    description: 'Dense layout to fit more on one page.',
    accent: '#1e293b',
    base: 9,
    name: 17,
    heading: 9.5,
    gap: 8,
    margin: 34,
    headingCase: 'upper',
    rule: true,
  },
};

export const dateRange = (start: string, end: string, current: boolean) =>
  [start, current ? 'Present' : end].filter(Boolean).join(' – ');

export const contactLine = (cv: TailoredCv) =>
  [
    cv.contact.email,
    cv.contact.phone,
    cv.contact.location,
    cv.contact.linkedin,
    cv.contact.github,
    cv.contact.website,
  ]
    .filter(Boolean)
    .map((s) => s.replace(/^https?:\/\/(www\.)?/, ''));

export function fileSlug(...parts: string[]) {
  return (
    parts
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'fitcv'
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
