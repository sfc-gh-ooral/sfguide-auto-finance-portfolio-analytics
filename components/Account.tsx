'use client';

// Small pieces shared by the collections queue and the account view.
const TONE: Record<string, string> = {
  Current: 'var(--good)', '30-59 DPD': 'var(--amber)', '60-89 DPD': 'var(--coral)', '90+ DPD': '#B4232C', 'Charged off': 'var(--text)',
};

export function History({ history, compact = false }: { history: string[]; compact?: boolean }) {
  return (
    <div className="flex items-center gap-[3px]" role="img" aria-label={`Month-end status, oldest first: ${history.join(', ')}`}>
      {history.map((s, i) => (
        <span key={i} title={s} className="rounded-[3px]" style={{ width: compact ? 8 : 22, height: compact ? 14 : 26, background: TONE[s] ?? 'var(--surface-3)', opacity: s === 'Current' ? 0.55 : 1 }} />
      ))}
    </div>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const tone = score >= 75 ? 'var(--coral)' : score >= 55 ? 'var(--amber)' : 'var(--teal)';
  return (
    <div className="flex items-center gap-2">
      <span className="font-bold tabular-nums w-7 text-right">{score}</span>
      <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }} aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${(score / 91) * 100}%`, background: tone }} />
      </span>
    </div>
  );
}

export const HISTORY_LEGEND = Object.entries(TONE).slice(0, 4);
