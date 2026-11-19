'use client';

// Staged progress for AI calls, drawn as a road with a car moving along it. The steps name what the
// Live path actually does. Sample mode advances them over the simulated delay; Live mode advances on
// a timer while the real call runs, and the last step holds until the answer arrives.
import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ASK_STEPS = [
  'Planning with Cortex Agent (AUTO_FINANCE_AGENT)',
  'Matching verified queries in AUTO_FINANCE_SV',
  'Generating SQL with Cortex Analyst',
  'Running the query on AUTO_FINANCE_WH',
  'Writing the answer',
];
export const NARRATIVE_STEPS = [
  'Reading the dealer funnel, declines, and first-payment defaults',
  'Grounding the facts: LTV mix, decline trend, FPD vs the book',
  'Drafting the narrative with AI_COMPLETE',
  'Formatting structured output',
];
export const ACCOUNT_STEPS = [
  'Reading the account and 12 months of month-end status',
  'Grounding the facts: balance, payment, roll-risk drivers',
  'Drafting the call summary with AI_COMPLETE',
  'Formatting structured output',
];

export function Reasoning({ steps, expectedMs, title = 'Working on it' }: { steps: string[]; expectedMs: number; title?: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - t0), 100);
    return () => window.clearInterval(id);
  }, []);
  const per = expectedMs / steps.length;
  const step = Math.min(steps.length - 1, Math.floor(elapsed / per));
  const pct = Math.min(94, (elapsed / expectedMs) * 100);

  return (
    <div className="reasoning fade-up" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--teal-strong)' }}>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />{title}
        </div>
        <span className="text-xs tabular-nums mono" style={{ color: 'var(--text-3)' }}>{(elapsed / 1000).toFixed(1)}s</span>
      </div>
      <div className="road mb-4" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'todo';
          return (
            <li key={s} className={`reasoning-step ${state} flex items-center gap-2 text-[13px]`}>
              {state === 'done' ? <Check className="w-4 h-4" style={{ color: 'var(--good)' }} aria-hidden />
                : state === 'active' ? <span className="w-4 h-4 rounded-full grad-bar animate-pulse" aria-hidden />
                  : <span className="w-4 h-4 rounded-full border" style={{ borderColor: 'var(--border-strong)' }} aria-hidden />}
              <span>{s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
