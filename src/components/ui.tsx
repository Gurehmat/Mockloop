import type {
  InputHTMLAttributes,
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-grid bg-[length:34px_34px]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export function Panel({
  children,
  className = '',
}: PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  type = 'button',
  className = '',
  disabled = false,
  to,
  variant = 'primary',
  onClick,
}: PropsWithChildren<{
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  to?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: MouseEventHandler<HTMLElement>;
}>) {
  const styles =
    variant === 'primary'
      ? 'bg-coral text-ink-950 hover:bg-[#ff906f]'
      : variant === 'secondary'
        ? 'bg-white/10 text-white hover:bg-white/15'
        : 'bg-transparent text-white hover:bg-white/10';

  const common = `inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${styles} ${
    disabled ? 'cursor-not-allowed opacity-60' : ''
  } ${className}`;

  if (to) {
    return (
      <Link className={common} onClick={onClick} to={to}>
        {children}
      </Link>
    );
  }

  return (
    <button className={common} disabled={disabled} onClick={onClick as MouseEventHandler<HTMLButtonElement> | undefined} type={type}>
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink-100">{label}</span>
      <input
        className="w-full rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-ink-400"
        {...props}
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </label>
  );
}

export function Select({
  label,
  error,
  children,
  ...props
}: PropsWithChildren<{
  label: string;
  error?: string | null;
} & SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink-100">{label}</span>
      <select
        className="w-full rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white"
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </label>
  );
}

export function Textarea({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string | null;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink-100">{label}</span>
      <textarea
        className="min-h-[160px] w-full rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-ink-400"
        {...props}
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </label>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: PropsWithChildren<{
  tone?: 'neutral' | 'red' | 'orange' | 'green' | 'blue';
}>) {
  const tones: Record<string, string> = {
    neutral: 'bg-white/10 text-white',
    red: 'bg-red-500/15 text-red-200',
    orange: 'bg-orange-500/15 text-orange-200',
    green: 'bg-emerald-500/15 text-emerald-200',
    blue: 'bg-sky-500/15 text-sky-200',
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function LoadingScreen({ title, description }: { title: string; description?: string }) {
  return (
    <AppShell>
      <div className="flex min-h-[70vh] items-center justify-center">
        <Panel className="max-w-lg text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-coral" />
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="mt-3 text-sm text-ink-300">{description}</p> : null}
        </Panel>
      </div>
    </AppShell>
  );
}

export function ErrorPanel({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="border-red-400/20 bg-red-500/10">
      <h2 className="text-lg font-semibold text-red-100">{title}</h2>
      <p className="mt-2 text-sm text-red-100/80">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Panel>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <progress className="progress-bar h-3 w-full overflow-hidden rounded-full" max={100} value={value} />
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">{eyebrow}</p> : null}
      <h2 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
      {description ? <p className="max-w-3xl text-base text-ink-300">{description}</p> : null}
    </div>
  );
}
