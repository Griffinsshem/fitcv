import Link from 'next/link';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span className="grid size-7 place-items-center rounded-md bg-accent text-[13px] font-bold text-white">
        F
      </span>
      <span className="text-[17px]">
        Fit<span className="text-accent">CV</span>
      </span>
    </Link>
  );
}
