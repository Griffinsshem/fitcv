'use client';

import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
  }
>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium',
        'transition-[background-color,box-shadow,transform,color] duration-200 ease-out',
        'active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-[15px]',
        variant === 'primary' &&
          'bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-accent-strong hover:shadow-[var(--shadow-accent)]',
        variant === 'secondary' &&
          'bg-paper text-ink shadow-[var(--shadow-soft)] ring-1 ring-line hover:bg-canvas hover:ring-line-strong',
        variant === 'ghost' && 'text-ink-soft hover:bg-sunk hover:text-ink',
        variant === 'danger' &&
          'bg-paper text-danger ring-1 ring-danger/25 hover:bg-danger-soft hover:ring-danger/40',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
      {children}
    </button>
  );
});

const fieldBase =
  'w-full rounded-[var(--radius-field)] bg-paper px-3.5 text-sm text-ink ring-1 ring-line placeholder:text-muted/70 ' +
  'transition-[box-shadow,background-color] duration-150 hover:ring-line-strong ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/60 focus:shadow-[0_0_0_4px_rgb(15_118_110/0.08)] ' +
  'aria-[invalid=true]:ring-danger/60 disabled:bg-sunk disabled:text-muted';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={clsx(fieldBase, 'h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(fieldBase, 'py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(fieldBase, 'h-11 cursor-pointer pr-8', className)}
        {...props}
      />
    );
  },
);

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-danger" role="alert">
          <AlertCircle className="size-3.5" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Elevation through soft tinted shadow + hairline ring, not a heavy border. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={clsx(
        'rounded-card bg-paper shadow-[var(--shadow-soft)] ring-1 ring-line/80',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'accent' | 'warn' | 'danger';
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'tabular inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
        tone === 'neutral' && 'bg-sunk text-ink-soft',
        tone === 'accent' && 'bg-accent-soft text-accent-strong',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'danger' && 'bg-danger-soft text-danger',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted" role="status">
      <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
      {label ?? 'Loading…'}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

export function Alert({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'warn' | 'accent';
  children: ReactNode;
}) {
  const Icon = tone === 'danger' ? AlertCircle : tone === 'accent' ? CheckCircle2 : Info;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={clsx(
        'flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm leading-snug',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'accent' && 'bg-accent-soft text-accent-strong',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function scoreColor(score: number | null) {
  if (score === null) return '#cbd5e1';
  return score >= 75 ? '#0f766e' : score >= 50 ? '#b7791f' : '#c2410c';
}

export function ScoreRing({
  score,
  size = 72,
  label,
}: {
  score: number | null;
  size?: number;
  label?: string;
}) {
  const stroke = 5;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const value = score ?? 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${label ?? 'Score'}: ${score ?? 'not scored yet'}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e8edf3"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * value) / 100}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <span className="tabular absolute inset-0 grid place-items-center text-lg font-semibold tracking-tight">
          {score === null ? '—' : score}
        </span>
      </div>
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-dots relative flex flex-col items-center overflow-hidden rounded-card px-6 py-16 text-center ring-1 ring-line">
      <div
        className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-canvas/80 to-canvas"
        aria-hidden
      />
      <div className="relative flex flex-col items-center">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-paper text-accent shadow-[var(--shadow-soft)] ring-1 ring-line">
          {icon}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
