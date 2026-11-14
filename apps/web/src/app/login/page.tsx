import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Logo } from '@/components/logo';
import { GoogleSignIn } from './google-sign-in';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-card border border-line bg-paper p-8 text-center">
          <h1 className="text-xl font-semibold">Sign in to FitCV</h1>
          <p className="mt-2 text-sm text-muted">
            One click with your Google account. No passwords to remember.
          </p>
          <div className="mt-7 flex justify-center">
            <Suspense>
              <GoogleSignIn />
            </Suspense>
          </div>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          We only receive your name, email and profile photo from Google.
        </p>
      </div>
    </main>
  );
}
