import { FlaskConical, Sparkles, Timer } from 'lucide-react';
import type { ReactNode } from 'react';

// "Powered by ..." badge: only capabilities this example actually runs in Live mode.
export function Powered({ children }: { children: ReactNode }) {
  return <span className="powered"><Sparkles className="w-3 h-3" aria-hidden />Powered by {children}</span>;
}

export function SampleLabel({ note }: { note?: string }) {
  return (
    <span className="sample-label" title="Scripted for Sample mode. Live mode calls Snowflake.">
      <FlaskConical className="w-3 h-3" aria-hidden />Sample AI response{note ? ` · ${note}` : ''}
    </span>
  );
}

export function Latency({ ms, model }: { ms?: number; model?: string }) {
  if (ms === undefined) return null;
  return (
    <span className="chip"><Timer className="w-3 h-3" aria-hidden />Live · {(ms / 1000).toFixed(1)}s{model ? ` · ${model}` : ''}</span>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="card p-4 text-sm" style={{ borderColor: 'var(--coral)', color: 'var(--text)' }}>
      <strong style={{ color: 'var(--coral)' }}>Live call failed.</strong> {message}
      <div className="mt-1" style={{ color: 'var(--text-3)' }}>Sample data is not substituted in Live mode. Check the connection in .env.local, or switch to Sample.</div>
    </div>
  );
}

export function Skeleton({ h = 120 }: { h?: number }) {
  return <div className="shimmer" style={{ height: h }} aria-hidden />;
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow: string; title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="max-w-3xl">
        <div className="eyebrow mb-1.5">{eyebrow}</div>
        <h1 className="text-[28px] leading-tight font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px]" style={{ color: 'var(--text-2)' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
