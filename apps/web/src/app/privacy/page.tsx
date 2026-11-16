import type { Metadata } from 'next';
import { DocPage } from '@/components/doc-page';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <DocPage title="Privacy policy" updated="16 November 2026">
      <p>
        FitCV helps you tailor your CV and cover letter to specific jobs. This page explains what we
        store, why, and how you stay in control.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From Google sign-in:</strong> your name, email address and profile photo. We never
          see or store your Google password.
        </li>
        <li>
          <strong>Your profile:</strong> the career details you enter or import (experience,
          education, skills, contact details).
        </li>
        <li>
          <strong>Your applications:</strong> job descriptions you paste, tailored CVs, cover
          letters, notes and statuses.
        </li>
        <li>
          <strong>Basic technical data:</strong> sign-in sessions and request logs used for security
          and reliability. Logs never include your CV content.
        </li>
      </ul>

      <h2>Uploaded CV files</h2>
      <p>
        When you upload a CV, the file is read in memory to extract its text and is never written to
        disk. The draft profile produced from it is deleted after 7 days if you don&apos;t save it.
      </p>

      <h2>AI processing</h2>
      <p>
        To tailor documents, the relevant parts of your profile and the job description are sent to
        our AI provider (Google Gemini or Anthropic Claude). They are used only to produce your
        result.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell your data or share it with employers or recruiters.</li>
        <li>We don&apos;t use advertising trackers.</li>
      </ul>

      <h2>Your control</h2>
      <p>
        You can edit your profile at any time. In <strong>Profile → Account and privacy</strong> you
        can sign out other devices or permanently delete your account, which removes your profile,
        applications and documents immediately.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your data? Contact the FitCV team through the project&apos;s GitHub page.
      </p>
    </DocPage>
  );
}
