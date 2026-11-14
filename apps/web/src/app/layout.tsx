import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FitCV — a CV and cover letter that fit the job', template: '%s · FitCV' },
  description:
    'Paste a job description and get an ATS-friendly CV and cover letter tailored to it, with a match score and keyword gap report.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#0f766e', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
