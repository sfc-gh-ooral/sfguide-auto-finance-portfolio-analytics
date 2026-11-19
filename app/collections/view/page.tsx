'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarCheck, CheckCircle2, Headset, Sparkles, UserRoundCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLoad, useSource, type Narrative } from '@/lib/source';
import { scoreParts } from '@/lib/derive';
import type { Account, ActionRecord } from '@/lib/types';
import { fmtInt } from '@/lib/utils';
import { ErrorNote, Latency, Powered, SampleLabel, Skeleton } from '@/components/Badges';
import { ACCOUNT_STEPS, Reasoning } from '@/components/Reasoning';
import { History, HISTORY_LEGEND, ScoreBar } from '@/components/Account';

export default function AccountView() {
  const src = useSource();
  const [id, setId] = useState<number | null>(null);
  const queue = useLoad(src, (s) => s.collections());
  useEffect(() => { const v = new URLSearchParams(window.location.search).get('id'); setId(v === null ? -1 : Number(v)); }, []);
  const target = id === -1 ? queue.data?.accounts[0]?.id ?? null : id;
  const acc = useLoad(src, (s) => (target === null ? new Promise<Account>(() => {}) : s.account(target)), [target]);
  if (queue.error || acc.error) return <ErrorNote message={(queue.error ?? acc.error)!} />;
  if (!acc.data || !queue.data) return <div className="space-y-4"><Skeleton h={140} /><Skeleton h={320} /></div>;
  return <Detail a={acc.data} collectors={queue.data.collectors} />;
}

function Detail({ a, collectors }: { a: Account; collectors: string[] }) {
  const src = useSource();
  const [sum, setSum] = useState<{ busy?: boolean; data?: Narrative; error?: string }>({});
  const parts = scoreParts(a);
  const pastDue = a.payment * (a.state === '60-89 DPD' ? 2 : 1);

  const summarize = async () => {
    if (!src) return;
    setSum({ busy: true });
    try { setSum({ data: await src.accountSummary(a.id) }); } catch (e) { setSum({ error: e instanceof Error ? e.message : String(e) }); }
  };

  return (
    <div className="space-y-6">
      <Link href="/collections" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--teal-strong)' }}><ArrowLeft className="w-4 h-4" aria-hidden />Collections queue</Link>
      <section className="hero p-6 sm:p-8 fade-up">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#9BDB3E' }}>Contract #{a.id} · synthetic borrower</div>
            <h1 className="mt-1 text-3xl font-bold text-white">{a.borrower}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm" style={{ color: '#B5CEC7' }}>
              <span className={`dpd ${a.state === '60-89 DPD' ? 'dpd-60' : 'dpd-30'}`}>{a.state}</span>
              <span>{a.newUsed} vehicle · {a.term} months · {a.apr.toFixed(2)}% APR</span>
              <span>Funded {a.fundedMonth} via <Link href={`/dealers/view?id=${a.dealerId}`} className="underline underline-offset-2">{a.dealer}</Link></span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Balance', `$${fmtInt(a.balance)}`], ['Past due (approx.)', `$${fmtInt(pastDue)}`], ['Roll-risk score', `${a.score} of 91`]].map(([l, v]) => (
              <div key={l} className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="text-xl font-bold text-white tabular-nums">{v}</div><div className="text-[11px]" style={{ color: '#9DB9B1' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_1.2fr] gap-4">
        <div className="card p-5">
          <h2 className="font-bold">Why it ranks here</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Roll-risk points (0 to 91). Same rule as the COLLECTIONS_QUEUE view.</p>
          <ul className="space-y-2.5">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-3 text-sm">
                <span className="flex-1">{p.label}</span>
                <span className="w-28 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }} aria-hidden><span className="block h-full grad-bar" style={{ width: `${(p.pts / 45) * 100}%` }} /></span>
                <span className="w-10 text-right font-bold tabular-nums">+{p.pts}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}><ScoreBar score={a.score} /></div>
          <h3 className="font-bold text-sm mt-6 mb-2">Month-end status, last {a.history.length} months</h3>
          <History history={a.history} />
          <div className="mt-2 flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
            {HISTORY_LEGEND.map(([s, c]) => <span key={s} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{s}</span>)}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[['Original amount', `$${fmtInt(a.amount)}`], ['Monthly payment', `$${a.payment.toFixed(2)}`], ['FICO band', a.band], ['LTV at origination', `${a.ltv}%`], ['Months on book', String(a.mob)], ['Term', `${a.term} months`]].map(([k, v]) => (
              <div key={k}><dt className="text-xs" style={{ color: 'var(--text-3)' }}>{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <section className="card p-5 relative overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-1 grad-bar" aria-hidden />
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: 'var(--teal)' }} aria-hidden /><h2 className="font-bold">Call summary for the collector</h2></div>
              <div className="flex items-center gap-2"><Powered>AI_COMPLETE</Powered>
                <button className="btn btn-primary" onClick={summarize} disabled={sum.busy}><Sparkles className="w-4 h-4" aria-hidden />{sum.data ? 'Regenerate' : 'Summarize account'}</button></div>
            </div>
            {sum.busy && <Reasoning steps={ACCOUNT_STEPS} expectedMs={6000} title="Preparing the call summary" />}
            {sum.error && <ErrorNote message={sum.error} />}
            {sum.data && !sum.busy && (
              <div className="fade-up">
                <div className="mb-3">{sum.data.source === 'sample' ? <SampleLabel /> : <Latency ms={sum.data.latencyMs} model={sum.data.model} />}</div>
                <div className="text-xl font-bold display">{sum.data.headline}</div>
                <ul className="mt-3 space-y-2">{sum.data.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-[15px]"><span className="mt-1.5 w-2 h-2 rounded-full shrink-0 grad-bar" aria-hidden /><span>{b}</span></li>))}</ul>
                <p className="mt-4 text-xs" style={{ color: 'var(--text-3)' }}>Grounded only in this account&apos;s figures. A suggestion for the collector, not a decision; follow your collections policy and applicable regulations.</p>
              </div>
            )}
            {!sum.data && !sum.busy && !sum.error && <p className="text-sm" style={{ color: 'var(--text-2)' }}>Get a short brief before the call: the situation, the main risk drivers, and a suggested next step.</p>}
          </section>
          <Actions a={a} collectors={collectors} pastDue={pastDue} />
        </div>
      </section>
    </div>
  );
}

function Actions({ a, collectors, pastDue }: { a: Account; collectors: string[]; pastDue: number }) {
  const src = useSource();
  const [log, setLog] = useState<ActionRecord[] | null>(null);
  const [collector, setCollector] = useState(collectors[a.id % collectors.length]);
  const [date, setDate] = useState('2026-11-15');
  const [amount, setAmount] = useState(pastDue.toFixed(2));
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; error?: string; busy?: boolean }>({});
  const reload = () => src?.actions(a.id).then(setLog).catch((e) => setMsg({ error: e instanceof Error ? e.message : String(e) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [src?.mode, a.id]);

  const save = async (action: 'ASSIGN' | 'PROMISE') => {
    if (!src) return;
    setMsg({ busy: true });
    try {
      const r = await src.recordAction({ contractId: a.id, action, collector, note: note || undefined,
        ...(action === 'PROMISE' ? { promiseDate: date, promiseAmount: Number(amount) } : {}) });
      setMsg({ ok: `Saved to ${r.savedTo}.` }); setNote(''); reload();
    } catch (e) { setMsg({ error: e instanceof Error ? e.message : String(e) }); }
  };

  return (
    <section className="card p-5">
      <h2 className="font-bold flex items-center gap-2"><Headset className="w-5 h-5" style={{ color: 'var(--teal)' }} aria-hidden />Record a decision</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Writes to COLLECTION_ACTIONS in Live mode. Nothing is sent to the borrower.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold">Collector
          <select className="input mt-1" value={collector} onChange={(e) => setCollector(e.target.value)}>{collectors.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="text-xs font-semibold">Note (optional)
          <input className="input mt-1" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. prefers evening calls" /></label>
        <label className="text-xs font-semibold">Promise date
          <input className="input mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="text-xs font-semibold">Promise amount ($)
          <input className="input mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn" onClick={() => save('ASSIGN')} disabled={msg.busy}><UserRoundCheck className="w-4 h-4" aria-hidden />Assign collector</button>
        <button className="btn btn-primary" onClick={() => save('PROMISE')} disabled={msg.busy || !(Number(amount) > 0)}><CalendarCheck className="w-4 h-4" aria-hidden />Record promise to pay</button>
      </div>
      {msg.ok && <p className="mt-3 text-sm flex items-center gap-2" style={{ color: 'var(--good)' }}><CheckCircle2 className="w-4 h-4" aria-hidden />{msg.ok}</p>}
      {msg.error && <div className="mt-3"><ErrorNote message={msg.error} /></div>}
      {log && log.length > 0 && (
        <ul className="mt-4 pt-4 border-t space-y-2 text-sm" style={{ borderColor: 'var(--border)' }}>
          {log.map((r, i) => (
            <li key={i} className="flex flex-wrap gap-x-3">
              <span className="font-semibold">{r.action === 'PROMISE' ? `Promise to pay $${r.promiseAmount?.toFixed(2)} by ${r.promiseDate}` : 'Assigned'}</span>
              <span style={{ color: 'var(--text-2)' }}>{r.collector}</span>
              {r.note && <span style={{ color: 'var(--text-3)' }}>“{r.note}”</span>}
              <span className="ml-auto text-xs mono" style={{ color: 'var(--text-3)' }}>{r.recordedAt.slice(0, 16).replace('T', ' ')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
