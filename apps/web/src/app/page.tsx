import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileDown,
  KanbanSquare,
  ScanSearch,
  Sprout,
  X,
} from 'lucide-react';
import { Logo } from '@/components/logo';

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function PrimaryCta({ children }: { children: ReactNode }) {
  return (
    <Link
      href="/login"
      className="group inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] transition-all duration-200 hover:bg-accent-strong hover:shadow-[var(--shadow-accent)] active:translate-y-px"
    >
      {children}
      <ArrowRight
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

/** Composed product preview built from real UI, not a screenshot. */
function HeroVisual() {
  const keywords: Array<[string, boolean]> = [
    ['TypeScript', true],
    ['PostgreSQL', true],
    ['REST APIs', true],
    ['Docker', true],
    ['Kubernetes', false],
  ];
  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:mr-0">
      <div
        className="animate-rise absolute -left-4 top-6 hidden w-[62%] -rotate-[4deg] rounded-2xl bg-paper p-5 shadow-[var(--shadow-lift)] ring-1 ring-line sm:block"
        style={delay(350)}
        aria-hidden
      >
        <p className="eyebrow">Job ad</p>
        <p className="mt-2 text-sm font-semibold">Backend Engineer · Kopa Labs</p>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full rounded bg-sunk" />
          <div className="h-2 w-11/12 rounded bg-sunk" />
          <div className="h-2 w-4/5 rounded bg-sunk" />
          <div className="h-2 w-9/12 rounded bg-sunk" />
        </div>
      </div>

      <div
        className="animate-rise relative ml-auto w-full rounded-2xl bg-paper p-6 shadow-[var(--shadow-lift)] ring-1 ring-line sm:w-[78%]"
        style={delay(150)}
        aria-hidden
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="display text-2xl">Wanjiru Kamau</p>
            <p className="text-xs text-muted">Backend Engineer · Nairobi</p>
          </div>
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-strong">
            Tailored
          </span>
        </div>
        <p className="eyebrow mt-5">Experience</p>
        <p className="mt-1.5 text-[13px] font-semibold">Software Engineer, Lipa Pay</p>
        <ul className="mt-1.5 space-y-1.5 text-[12.5px] leading-snug text-ink-soft">
          <li className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-soft" />
            <span>
              Built{' '}
              <mark className="rounded bg-accent-soft px-0.5 text-accent-strong">REST APIs</mark> in{' '}
              <mark className="rounded bg-accent-soft px-0.5 text-accent-strong">TypeScript</mark>{' '}
              serving 40k daily M-Pesa payments
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-soft" />
            <span>
              Cut{' '}
              <mark className="rounded bg-accent-soft px-0.5 text-accent-strong">PostgreSQL</mark>{' '}
              query time by 63% with targeted indexes
            </span>
          </li>
        </ul>
        <p className="eyebrow mt-5">Skills</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keywords.map(([k, hit]) => (
            <span
              key={k}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                hit ? 'bg-sunk text-ink-soft' : 'bg-warn-soft text-warn'
              }`}
            >
              {hit ? <Check className="size-3" /> : <X className="size-3" />}
              {k}
            </span>
          ))}
        </div>
      </div>

      <div
        className="animate-rise absolute -bottom-14 left-0 flex items-center gap-4 rounded-2xl bg-ink px-5 py-3.5 text-white shadow-[var(--shadow-lift)] sm:left-8"
        style={delay(600)}
        aria-hidden
      >
        <div>
          <p className="text-[11px] font-medium text-white/60">Match score</p>
          <p className="tabular mt-0.5 flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
            <span className="text-base text-white/45 line-through decoration-1">52</span>
            89
          </p>
        </div>
        <span className="tabular rounded-md bg-accent px-2 py-1 text-xs font-semibold">+37</span>
      </div>
    </div>
  );
}

const steps = [
  {
    title: 'Add your profile once',
    body: 'Upload your current CV or fill in a short form. This becomes the master copy every application is built from.',
  },
  {
    title: 'Paste the job ad',
    body: 'FitCV pulls out the skills and keywords recruiters and screening software check for, ranked by importance.',
  },
  {
    title: 'Send a CV that fits',
    body: 'Download a tailored CV and a matching cover letter as PDF or Word, ready in about a minute.',
  },
];

export default function Home() {
  return (
    <div className="overflow-x-clip bg-canvas">
      <header className="relative z-10">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"
          aria-label="Main"
        >
          <Logo />
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#how"
              className="hidden rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:block"
            >
              How it works
            </a>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-sunk"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main id="main">
        <section className="relative">
          <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" />
          <div
            className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-[radial-gradient(circle,rgb(94_234_212/0.28),transparent_65%)] blur-2xl"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pb-28 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
            <div>
              <p
                className="animate-rise inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-soft shadow-[var(--shadow-soft)] ring-1 ring-line"
                style={delay(0)}
              >
                <span className="size-1.5 rounded-full bg-accent" />
                Free while in early access
              </p>
              <h1
                className="display animate-rise mt-6 text-[clamp(2.75rem,6.2vw,4.75rem)] text-ink"
                style={delay(80)}
              >
                Your CV, cut to fit <em className="text-accent">every</em> job.
              </h1>
              <p
                className="animate-rise mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-soft"
                style={delay(160)}
              >
                Paste a job ad. FitCV rewrites and reorders your real experience to match it, writes
                the cover letter, and shows exactly which keywords you are missing.
              </p>
              <div
                className="animate-rise mt-9 flex flex-wrap items-center gap-x-6 gap-y-4"
                style={delay(240)}
              >
                <PrimaryCta>Tailor my first CV</PrimaryCta>
                <span className="text-sm text-muted">One click with Google. No card needed.</span>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        <section id="how" className="scroll-mt-8 border-y border-line/80 bg-paper">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[0.8fr_2fr]">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="display mt-3 text-4xl">Three steps, about a minute.</h2>
            </div>
            <ol className="grid gap-10 sm:grid-cols-3 sm:gap-6">
              {steps.map((s, i) => (
                <li key={s.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="tabular grid size-8 place-items-center rounded-lg bg-accent-soft text-sm font-semibold text-accent-strong">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 && (
                      <span className="hidden h-px flex-1 bg-gradient-to-r from-line-strong to-transparent sm:block" />
                    )}
                  </div>
                  <h3 className="mt-5 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">What you get</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">
              Built to get past the filter and into the interview.
            </h2>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-6">
            <article className="relative overflow-hidden rounded-3xl bg-paper p-7 shadow-[var(--shadow-soft)] ring-1 ring-line md:col-span-4">
              <ScanSearch className="size-5 text-accent" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">Match score and keyword gap report</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                Every required and preferred keyword from the ad, marked found or missing. Plain
                code checks your CV, not the AI, so the score can be checked and reproduced.
              </p>
              <div className="mt-7 grid gap-2 sm:grid-cols-2" aria-hidden>
                {(
                  [
                    ['React', true, 'Required'],
                    ['Node.js', true, 'Required'],
                    ['CI/CD pipelines', false, 'Required'],
                    ['GraphQL', false, 'Preferred'],
                  ] as const
                ).map(([term, hit, imp]) => (
                  <div
                    key={term}
                    className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2.5 text-sm ring-1 ring-line/70"
                  >
                    <span className="flex items-center gap-2">
                      {hit ? (
                        <Check className="size-4 text-accent" />
                      ) : (
                        <X className="size-4 text-warn" />
                      )}
                      {term}
                    </span>
                    <span className="text-xs text-muted">{imp}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="relative overflow-hidden rounded-3xl bg-ink p-7 text-white md:col-span-2 md:row-span-2">
              <div
                className="absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(circle,rgb(94_234_212/0.35),transparent_70%)]"
                aria-hidden
              />
              <p className="eyebrow relative !text-white/50">Our promise</p>
              <h3 className="display relative mt-4 text-3xl leading-tight">
                It never invents experience you don&apos;t have.
              </h3>
              <p className="relative mt-4 text-sm leading-relaxed text-white/70">
                The AI may reword and reorder your real experience. A safety check in code then
                removes any employer, job title, date, degree or skill that isn&apos;t in your
                profile, before you ever see it.
              </p>
              <div className="relative mt-8 space-y-2 text-sm" aria-hidden>
                <p className="flex items-center gap-2 text-white/80">
                  <Check className="size-4 text-teal-300" /> Reworded for the role
                </p>
                <p className="flex items-center gap-2 text-white/80">
                  <Check className="size-4 text-teal-300" /> Reordered by relevance
                </p>
                <p className="flex items-center gap-2 text-white/45 line-through">
                  <X className="size-4" /> Made-up job titles
                </p>
              </div>
            </article>

            <article className="rounded-3xl bg-paper p-7 shadow-[var(--shadow-soft)] ring-1 ring-line md:col-span-2">
              <Sprout className="size-5 text-accent" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-4 font-semibold">Skills to build, not fake</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Missing skills come with a practical way to learn them.
              </p>
            </article>
            <article className="rounded-3xl bg-paper p-7 shadow-[var(--shadow-soft)] ring-1 ring-line md:col-span-2">
              <KanbanSquare className="size-5 text-accent" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-4 font-semibold">Application tracker</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Saved, applied, interviewing, offer. Notes for every job.
              </p>
            </article>
            <article className="rounded-3xl bg-paper p-7 shadow-[var(--shadow-soft)] ring-1 ring-line md:col-span-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <FileDown
                    className="mt-0.5 size-5 shrink-0 text-accent"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div>
                    <h3 className="font-semibold">Three ATS-safe templates, PDF or Word</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      Single-column layouts with real text that applicant tracking systems read
                      reliably. Edit anything before you download.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2" aria-hidden>
                  {['Classic', 'Modern', 'Compact'].map((t, i) => (
                    <span
                      key={t}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ${
                        i === 1
                          ? 'bg-accent-soft text-accent-strong ring-accent/20'
                          : 'bg-canvas text-ink-soft ring-line'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="px-5 pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-accent-faint px-8 py-16 ring-1 ring-accent/15 sm:px-14">
            <div className="bg-dots absolute inset-0 opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
              <h2 className="display max-w-xl text-4xl sm:text-5xl">
                Your next application deserves a CV made for it.
              </h2>
              <PrimaryCta>Get started free</PrimaryCta>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="tabular">© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex gap-5" aria-label="Legal">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <a
              href="https://github.com/Griffinsshem/fitcv"
              className="inline-flex items-center gap-0.5 hover:text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              Source <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
