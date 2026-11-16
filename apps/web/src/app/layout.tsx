import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

const instrumentSerif = localFont({
  src: [
    { path: '../fonts/instrument-serif-latin-400-normal.woff2', style: 'normal', weight: '400' },
    { path: '../fonts/instrument-serif-latin-400-italic.woff2', style: 'italic', weight: '400' },
  ],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const description =
  'Paste a job description and get an ATS-friendly CV and cover letter tailored to it, with a match score and a keyword gap report.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitcv-wheat.vercel.app'),
  title: { default: 'FitCV — a CV and cover letter that fit the job', template: '%s · FitCV' },
  description,
  applicationName: 'FitCV',
  openGraph: {
    type: 'website',
    siteName: 'FitCV',
    title: 'FitCV — a CV and cover letter that fit the job',
    description,
  },
  twitter: { card: 'summary_large_image', title: 'FitCV', description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#0f766e', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="grain min-h-dvh font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
