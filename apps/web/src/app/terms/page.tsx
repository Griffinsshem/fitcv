import type { Metadata } from 'next';
import { DocPage } from '@/components/doc-page';

export const metadata: Metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <DocPage title="Terms of use" updated="16 November 2026">
      <p>By using FitCV you agree to these terms. They are short on purpose.</p>

      <h2>Your content stays yours</h2>
      <p>
        You own your profile, CVs and cover letters. You give FitCV permission to process them only
        to provide the service to you.
      </p>

      <h2>Be truthful</h2>
      <p>
        FitCV reworks the experience you provide; it is designed not to invent qualifications. You
        are responsible for checking every document before you send it and for making sure it
        accurately represents you.
      </p>

      <h2>No guarantees</h2>
      <p>
        AI-generated suggestions can contain mistakes, and a higher match score does not guarantee
        an interview or a job. FitCV is provided as-is during early access.
      </p>

      <h2>Fair use</h2>
      <p>
        To keep the service available for everyone, AI generations are limited per day. Don&apos;t
        attempt to abuse, overload or reverse-engineer the service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as FitCV grows, for example when paid plans are introduced. The
        date at the top shows the latest version.
      </p>
    </DocPage>
  );
}
