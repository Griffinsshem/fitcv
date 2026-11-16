import Link from 'next/link';

/** Wordmark: a cut-corner "fit" mark (a page whose corner is tailored). */
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-md font-semibold tracking-tight text-ink"
      aria-label="FitCV home"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        aria-hidden
        className="transition-transform duration-300 group-hover:-rotate-6"
      >
        <path d="M5 3h11l6 6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#0f766e" />
        <path d="M16 3v4a2 2 0 0 0 2 2h4" fill="#5eead4" />
        <path
          d="M8 14.5l3 3 6.5-6.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[17px]">
        Fit<span className="text-accent">CV</span>
      </span>
    </Link>
  );
}
