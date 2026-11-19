'use client';

import { ArrowUp, BadgeCheck, ChevronDown, Code2, Sparkles, Table2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSource } from '@/lib/source';
import { SUGGESTED } from '@/lib/questions';
import type { AskAnswer } from '@/lib/types';
import { ASK_STEPS, Reasoning } from '@/components/Reasoning';
import { ErrorNote, Latency, PageHeader, Powered, SampleLabel } from '@/components/Badges';
import { ResultChart, ResultTableView } from '@/components/ResultChart';

interface Turn { id: number; question: string; answer?: AskAnswer; error?: string }

export default function Ask() {
  const src = useSource();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const busy = turns.some((t) => !t.answer && !t.error);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const ask = async (question: string) => {
    if (!src || !question.trim() || busy) return;
    const id = Date.now();
    setTurns((t) => [...t, { id, question }]);
    setInput('');
    try {
      const answer = await src.ask(question.trim());
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : String(e) } : x)));
    }
  };

  useEffect(() => {
    if (!src || started.current) return;
    started.current = true;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) ask(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns]);

  return (
    <div>
      <PageHeader eyebrow="Ask" title="Ask the portfolio in plain English"
        subtitle="Questions go to a Cortex Agent that writes SQL with Cortex Analyst over the AUTO_FINANCE_SV semantic view: one governed definition of delinquency, charge-offs, look-to-book, and first-payment default for every team. Each answer shows the SQL it ran."
        right={<div className="flex flex-wrap gap-2"><Powered>Cortex Agents</Powered><Powered>Cortex Analyst</Powered></div>} />

      <div className="grid xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-5">
          {turns.length === 0 && (
            <div className="card p-8 text-center fade-up">
              <div className="w-14 h-14 mx-auto rounded-2xl grad-bar flex items-center justify-center mb-4"><Sparkles className="w-6 h-6" style={{ color: '#062019' }} aria-hidden /></div>
              <h2 className="text-xl font-bold">What do you want to know about the portfolio?</h2>
              <p className="mt-2 text-sm max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>Try one of these. Each is answered from the same governed definitions the screens use.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTED.map((q) => <button key={q.id} className="btn" onClick={() => ask(q.question)}>{q.question}</button>)}
              </div>
            </div>
          )}
          {turns.map((t) => <TurnView key={t.id} turn={t} live={src?.mode === 'live'} />)}
          <div ref={endRef} />

          <form className="card p-2 flex items-center gap-2 sticky bottom-4 glass" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input className="input !border-0 !shadow-none !bg-transparent" placeholder="Ask about originations, dealers, delinquency, or charge-offs…"
              value={input} onChange={(e) => setInput(e.target.value)} aria-label="Your question" maxLength={500} />
            <button className="btn btn-primary !px-3" disabled={busy || !input.trim()} aria-label="Ask"><ArrowUp className="w-4 h-4" /></button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <div className="eyebrow mb-3">Suggested questions</div>
            <div className="space-y-2">
              {SUGGESTED.map((q) => (
                <button key={q.id} onClick={() => ask(q.question)} disabled={busy}
                  className="w-full text-left text-sm p-3 rounded-xl border card-hover" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  {q.question}
                  <span className="block mt-1 text-[11px] font-semibold" style={{ color: 'var(--indigo)' }}>{q.persona}{q.verified ? ' · verified query' : ''}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="card p-4 text-sm" style={{ color: 'var(--text-2)' }}>
            <div className="eyebrow mb-2">Why answers are consistent</div>
            Metrics such as 30+ DPD rate and first-payment default rate are defined once in the semantic view, with
            owners and synonyms. Verified queries pin the SQL for the most common questions, so the answer matches
            the charts on the other screens.
          </div>
        </aside>
      </div>
    </div>
  );
}

function TurnView({ turn, live }: { turn: Turn; live: boolean }) {
  const [showSql, setShowSql] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const a = turn.answer;
  const q = SUGGESTED.find((s) => s.question.toLowerCase() === (a?.question ?? turn.question).toLowerCase());
  return (
    <div className="space-y-3 fade-up">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-sm font-medium" style={{ background: 'var(--ink)', color: '#E8F1EE' }}>{turn.question}</div>
      </div>
      {turn.error ? <ErrorNote message={turn.error} /> : !a ? <Reasoning steps={ASK_STEPS} expectedMs={live ? 15000 : 6000} title="Asking the semantic layer" /> : (
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {a.source === 'sample' ? <SampleLabel note="captured from a Live run" /> : <Latency ms={a.latencyMs} />}
            <Powered>Cortex Agent + Cortex Analyst</Powered>
            {a.verifiedQueryUsed && <span className="chip chip-covered"><BadgeCheck className="w-3 h-3" aria-hidden />Verified query used</span>}
          </div>
          <AnswerText text={a.text} />
          {a.result && a.result.rows.length > 0 && (
            <div className="rounded-2xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <ResultChart result={a.result} kind={q?.chart} />
              {(q?.chart === 'none' || showTable) && <div className="mt-2"><ResultTableView result={a.result} /></div>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {a.sql && <button className="btn" onClick={() => setShowSql((s) => !s)}><Code2 className="w-4 h-4" aria-hidden />{showSql ? 'Hide' : 'Show'} SQL<ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSql ? 'rotate-180' : ''}`} aria-hidden /></button>}
            {a.result && q?.chart !== 'none' && <button className="btn" onClick={() => setShowTable((s) => !s)}><Table2 className="w-4 h-4" aria-hidden />{showTable ? 'Hide' : 'Show'} table</button>}
          </div>
          {showSql && a.sql && <pre className="mono text-xs p-4 rounded-xl overflow-x-auto fade-up" style={{ background: 'var(--ink)', color: '#BFE9DF' }}>{a.sql}</pre>}
        </div>
      )}
    </div>
  );
}

// Light formatting for agent text: paragraphs, bullet lists, and **bold**.
function AnswerText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
  return (
    <div className="space-y-2 text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s/.test(l) || !l.trim())) {
          return <ul key={i} className="list-disc pl-5 space-y-1">{lines.filter((l) => l.trim()).map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s/, ''))}</li>)}</ul>;
        }
        if (/^\|.*\|$/.test(lines[0]?.trim() ?? '')) return null; // tables are shown as a chart/table instead
        return <p key={i}>{lines.map((l, j) => <span key={j}>{inline(l.replace(/^#+\s*/, ''))}{j < lines.length - 1 && <br />}</span>)}</p>;
      })}
    </div>
  );
}
