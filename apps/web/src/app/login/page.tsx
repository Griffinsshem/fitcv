import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { GoogleSignIn } from './google-sign-in';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
          <p className="eyebrow">Welcome</p>
          <h1 className="display mt-3 text-5xl">Sign in to FitCV</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            One click with your Google account. No passwords to remember.
          </p>
          <div className="mt-10">
            <Suspense>
              <GoogleSignIn />
            </Suspense>
          </div>
          <p className="mt-10 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <ShieldCheck className="mt-px size-4 shrink-0 text-accent" aria-hidden />
            We only receive your name, email and profile photo from Google. You can delete your
            account and all your data at any time.
          </p>
        </div>
        <p className="text-xs text-muted">
          By continuing you agree to the{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
            Privacy policy
          </Link>
          .
        </p>
      </section>

      <aside
        className="relative hidden overflow-hidden bg-ink lg:flex lg:items-center lg:justify-center"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute -right-24 -top-24 size-[520px] rounded-full bg-[radial-gradient(circle,rgb(94_234_212/0.3),transparent_65%)]" />
        <div className="relative max-w-md px-10 text-white">
          <p className="display text-[2.6rem] leading-[1.08]">
            “The same experience, told the way <em className="text-teal-300">this</em> employer
            needs to hear it.”
          </p>
          <div className="mt-10 space-y-3 text-sm text-white/75">
            {[
              'Tailored CV and cover letter in about a minute',
              'See exactly which keywords you are missing',
              'Never invents experience you don’t have',
            ].map((t) => (
              <p key={t} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center rounded-md bg-white/10">
                  <Check className="size-3.5 text-teal-300" />
                </span>
                {t}
              </p>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
