import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/logo';

const steps = [
  {
    n: '1',
    title: 'Add your profile once',
    body: 'Upload your current CV or fill in the form. This becomes your master profile.',
  },
  {
    n: '2',
    title: 'Paste a job description',
    body: 'FitCV pulls out the skills and keywords recruiters and ATS filters look for.',
  },
  {
    n: '3',
    title: 'Download a CV that fits',
    body: 'Get a tailored CV and matching cover letter as PDF or Word, ready to send.',
  },
];

const features = [
  {
    icon: Gauge,
    title: 'Match score',
    body: 'See how well you fit before and after tailoring, weighted by what the job requires.',
  },
  {
    icon: ClipboardList,
    title: 'Keyword gap report',
    body: 'Every required and preferred keyword, marked found or missing, so nothing slips.',
  },
  {
    icon: FileText,
    title: 'ATS-safe templates',
    body: 'Clean single-column layouts that parse reliably in applicant tracking systems.',
  },
  {
    icon: Sparkles,
    title: 'Skill suggestions',
    body: 'Missing skills come with a practical way to gain them, never faked on your CV.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest by design',
    body: 'A safety check strips any job, title, date or skill that is not in your profile.',
  },
  {
    icon: CheckCircle2,
    title: 'Application tracker',
    body: 'Track every application from saved to offer, with notes, in one place.',
  },
];

export default function Home() {
  return (
    <div className="bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink">
          Sign in
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:pt-20">
          <p className="mb-4 text-sm font-medium text-accent">
            For job seekers who apply with intent
          </p>
          <h1 className="max-w-3xl font-serif text-4xl leading-[1.1] tracking-tight sm:text-6xl">
            A CV and cover letter that fit the job, every time.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Paste a job description. FitCV rewrites and reorders your real experience to match it,
            scores the fit, and shows exactly which keywords you are missing.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 font-medium text-white hover:bg-accent-strong"
            >
              Tailor my first CV <ArrowRight className="size-4" aria-hidden />
            </Link>
            <span className="text-sm text-muted">
              Free while in early access · Sign in with Google
            </span>
          </div>
        </section>

        <section className="border-y border-line bg-canvas">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n}>
                <span className="font-serif text-3xl text-accent">{s.n}</span>
                <h2 className="mt-2 text-lg font-semibold">{s.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-xl font-serif text-3xl tracking-tight">
            Built to get you past the filter and into the interview.
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <f.icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} FitCV</span>
          <span>Your data is yours. Delete your account anytime.</span>
        </div>
      </footer>
    </div>
  );
}
