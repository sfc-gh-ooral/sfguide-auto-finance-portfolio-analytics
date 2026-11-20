'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, Flag, MapPin, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, Pie, PieChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar } from 'recharts';
import { useLoad, useSource, type Narrative } from '@/lib/source';
import { REASON_COLORS, REVIEW_REASONS, dealerFacts } from '@/lib/derive';
import type { Dealer } from '@/lib/types';
import { div, fmtInt, fmtMonth, fmtPct, fmtUsd, sum } from '@/lib/utils';
import { ErrorNote, Latency, Powered, SampleLabel, Skeleton } from '@/components/Badges';
import { NARRATIVE_STEPS, Reasoning } from '@/components/Reasoning';

const REASONS = ['Credit score', 'Debt-to-income', 'Income verification', 'Vehicle valuation', 'Stipulations not met', 'LTV above policy'];
const MONTHS = Array.from({ length: 24 }, (_, i) => new Date(Date.UTC(2024, 10 + i, 1)).toISOString().slice(0, 7));

export default function DealerView() {
  const src = useSource();
  const [id, setId] = useState<number | null>(null);
  useEffect(() => { setId(Number(new URLSearchParams(window.location.search).get('id') ?? 7) || 7); }, []);
  const { data: d, error } = useLoad(src, (s) => s.dealer(id ?? 7), [id]);
  if (error) return <ErrorNote message={error} />;
  if (!d || id === null) return <div className="space-y-4"><Skeleton h={120} /><Skeleton h={320} /></div>;
  return <DealerDetail d={d} />;
}

function DealerDetail({ d }: { d: Dealer }) {
  const src = useSource();
  const [nar, setNar] = useState<{ busy?: boolean; data?: Narrative; error?: string }>({});
  const last12 = (a: number[]) => sum(a.slice(12));
  const apps = last12(d.apps), appr = last12(d.approved), fund = last12(d.funded);
  const series = MONTHS.map((m, i) => ({ month: fmtMonth(m), decline: 1 - div(d.approved[i], d.apps[i]), ltv: div(d.usedLtvSum[i], d.usedN[i]) || null, apps: d.apps[i] }));
  const reasons = REASONS.map((r, i) => ({ name: r, value: d.reasons[i] })).filter((r) => r.value > 0);
  const attainment = div(sum(d.funded.slice(21)), d.targetMonthlyUnits * 3);
  const fpd26 = div(sum(d.fpd.slice(14, 23)), sum(d.funded.slice(14, 23)));
  const fpdSeries = MONTHS.slice(0, 23).map((m, i) => ({ month: fmtMonth(m), rate: d.funded[i] ? d.fpd[i] / d.funded[i] : null, n: d.fpd[i] }));

  const explain = async () => {
    if (!src) return;
    setNar({ busy: true });
    try { setNar({ data: await src.narrative(d.id) }); } catch (e) { setNar({ error: e instanceof Error ? e.message : String(e) }); }
  };
  const exportBrief = () => {
    const lines = [`Dealer brief: ${d.name}`, '(Synthetic data. Illustrative only.)', '', ...dealerFacts(d)];
    if (nar.data) lines.push('', nar.data.headline, ...nar.data.bullets.map((b) => `- ${b}`), '', nar.data.source === 'sample' ? 'Sample AI response' : `AI_COMPLETE (${nar.data.model})`);
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `dealer-${d.id}-brief.txt`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Link href="/dealers" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--teal-strong)' }}><ArrowLeft className="w-4 h-4" aria-hidden />All dealers</Link>
      <section className="hero p-6 sm:p-8 fade-up">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#9BDB3E' }}>Dealer drill-down · #{d.id}</div>
            <h1 className="mt-1 text-3xl font-bold text-white">{d.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm" style={{ color: '#B5CEC7' }}>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" aria-hidden />{d.state} · {d.region}</span>
              <span className="flex items-center gap-1.5"><UserRound className="w-4 h-4" aria-hidden />RM {d.rm}</span>
              <span>{d.type} · since {d.onboarded.slice(0, 4)}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[['Funded volume', fmtUsd(last12(d.fundedCents) / 100)], ['FPD rate, 2026', fmtPct(fpd26)], ['Target attainment', fmtPct(attainment, 0)]].map(([l, v]) => (
              <div key={l} className="min-w-0 rounded-2xl px-3 sm:px-4 py-3" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="text-base sm:text-xl font-bold text-white tabular-nums">{v}</div><div className="text-[11px]" style={{ color: '#9DB9B1' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <p className="text-xs -mt-3" style={{ color: 'var(--text-3)' }}>Funded volume covers the last 12 months (Nov 2025 to Oct 2026). FPD rate: contracts funded Jan-Sep 2026 whose first payment was 30+ days late. Attainment: last 3 months.</p>

      <section className="grid xl:grid-cols-[1fr_1.6fr] gap-4">
        <div className="card p-5">
          <h2 className="font-bold mb-4">Funnel, last 12 months</h2>
          {[['Applications', apps, 'var(--sky)'], ['Approved', appr, 'var(--teal)'], ['Funded', fund, 'var(--lime)']].map(([l, v, c], i) => (
            <div key={String(l)} className="mb-4">
              <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold">{l}</span>
                <span className="tabular-nums">{fmtInt(Number(v))}{i > 0 && <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>{fmtPct(div(Number(v), i === 1 ? apps : appr))} {i === 1 ? 'approval' : 'look-to-book'}</span>}</span></div>
              <div className="h-9 rounded-xl overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                <div className="h-full rounded-xl transition-all duration-1000" style={{ width: `${div(Number(v), apps) * 100}%`, background: String(c) }} />
              </div>
            </div>
          ))}
          <h3 className="font-bold mt-6 mb-1 text-sm">Decline reasons, 24 months</h3>
          <div className="flex items-center gap-3">
            <div className="h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer><PieChart><Pie data={reasons} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                {reasons.map((r) => <Cell key={r.name} fill={REASON_COLORS[REASONS.indexOf(r.name)]} />)}</Pie><Tooltip formatter={(v) => fmtInt(Number(v))} /></PieChart></ResponsiveContainer>
            </div>
            <ul className="text-xs space-y-1.5">{reasons.sort((a, b) => b.value - a.value).map((r) => (
              <li key={r.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: REASON_COLORS[REASONS.indexOf(r.name)] }} />{r.name}<span className="tabular-nums font-semibold ml-auto pl-3">{fmtInt(r.value)}</span></li>))}</ul>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Decline rate and used-vehicle LTV</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>Line: decline rate. Bars: average used-vehicle LTV. Dashed line: 120% LTV policy.</p>
          <div className="h-[330px]">
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} interval={2} />
                <YAxis yAxisId="l" domain={[0, 0.7]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} width={42} />
                <YAxis yAxisId="r" orientation="right" domain={[80, 150]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={44} />
                <Tooltip formatter={(v, n) => (n === 'Decline rate' ? fmtPct(Number(v)) : `${Number(v).toFixed(1)}%`)} />
                <Bar yAxisId="r" dataKey="ltv" name="Used LTV" fill="#6A78F0" fillOpacity={0.28} radius={[6, 6, 0, 0]} />
                <ReferenceLine yAxisId="r" y={120} stroke="#F0A20B" strokeDasharray="5 5" label={{ value: '120% policy', position: 'insideTopLeft', fill: '#F0A20B', fontSize: 11 }} />
                <Line yAxisId="l" type="monotone" dataKey="decline" name="Decline rate" stroke="#F2594B" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="card p-5">
          <h2 className="font-bold">First-payment defaults by funded month</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>Share of contracts funded each month whose first payment was 30+ days past due. Contracts funded in Oct 2026 have no first payment yet.</p>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={fpdSeries} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} interval={2} />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} width={42} />
                <Tooltip formatter={(v) => fmtPct(Number(v))} />
                <Bar dataKey="rate" name="FPD rate" fill="#6A78F0" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <Review d={d} />
      </section>

      <section className="card p-5 relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1 grad-bar" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: 'var(--teal)' }} aria-hidden /><h2 className="font-bold">AI narrative for the relationship manager</h2></div>
          <div className="flex flex-wrap items-center gap-2"><Powered>AI_COMPLETE</Powered>
            <button className="btn btn-primary" onClick={explain} disabled={nar.busy}><Sparkles className="w-4 h-4" aria-hidden />{nar.data ? 'Regenerate' : 'Explain this dealer'}</button>
            <button className="btn" onClick={exportBrief}><Download className="w-4 h-4" aria-hidden />Export brief</button></div>
        </div>
        {nar.busy && <Reasoning steps={NARRATIVE_STEPS} expectedMs={src?.mode === 'live' ? 6000 : 6000} title="Writing the narrative" />}
        {nar.error && <ErrorNote message={nar.error} />}
        {nar.data && !nar.busy && (
          <div className="fade-up">
            <div className="mb-3">{nar.data.source === 'sample' ? <SampleLabel note={d.id === 7 || d.id === 23 ? 'captured from a Live run' : undefined} /> : <Latency ms={nar.data.latencyMs} model={nar.data.model} />}</div>
            <div className="text-xl font-bold display">{nar.data.headline}</div>
            <ul className="mt-3 space-y-2">{nar.data.bullets.map((b, i) => (
              <li key={i} className="flex gap-3 text-[15px]"><span className="mt-1.5 w-2 h-2 rounded-full shrink-0 grad-bar" aria-hidden /><span>{b}</span></li>))}</ul>
            <p className="mt-4 text-xs" style={{ color: 'var(--text-3)' }}>Grounded only in this dealer&apos;s figures shown above. Review before sharing; not credit or compliance advice.</p>
          </div>
        )}
        {!nar.data && !nar.busy && !nar.error && <p className="text-sm" style={{ color: 'var(--text-2)' }}>Generate a short, plain-language summary of what changed at this dealer, the likely driver in the data, and a next step. Then export a brief for the relationship manager.</p>}
      </section>
    </div>
  );
}

function Review({ d }: { d: Dealer }) {
  const src = useSource();
  const [reason, setReason] = useState(REVIEW_REASONS[0]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; error?: string; busy?: boolean }>({});
  const save = async () => {
    if (!src) return;
    setMsg({ busy: true });
    try { const r = await src.flagDealer(d.id, reason, d.rm, note); setMsg({ ok: `Review assigned to ${d.rm}. Saved to ${r.savedTo}.` }); setNote(''); }
    catch (e) { setMsg({ error: e instanceof Error ? e.message : String(e) }); }
  };
  return (
    <div className="card p-5">
      <h2 className="font-bold flex items-center gap-2"><Flag className="w-5 h-5" style={{ color: 'var(--coral)' }} aria-hidden />Flag for review</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Assigns a review to the relationship manager. Writes to DEALER_REVIEWS in Live mode; nothing changes in dealer setup or credit policy.</p>
      <label className="text-xs font-semibold block">Reason
        <select className="input mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>{REVIEW_REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label className="text-xs font-semibold block mt-3">Note (optional)
        <input className="input mt-1" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. pull the last 20 funded deal jackets" /></label>
      <button className="btn btn-primary mt-4" onClick={save} disabled={msg.busy}><Flag className="w-4 h-4" aria-hidden />Assign review to {d.rm}</button>
      {msg.ok && <p className="mt-3 text-sm flex items-center gap-2" style={{ color: 'var(--good)' }}><CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />{msg.ok}</p>}
      {msg.error && <div className="mt-3"><ErrorNote message={msg.error} /></div>}
    </div>
  );
}
