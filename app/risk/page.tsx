'use client';

import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLoad, useSource } from '@/lib/source';
import { dpdSeries, mixSeries, QUARTER_LABELS, rollRates, segmentCurves, vintageCurves } from '@/lib/derive';
import { fmtInt, fmtPct } from '@/lib/utils';
import { ErrorNote, PageHeader, Powered, Skeleton } from '@/components/Badges';

const BAND_COLORS = ['#F2594B', '#F0A20B', '#2F9BFF', '#00A396', '#7C8CF8'];
const VINTAGE_COLORS = ['#A3B1BF', '#F2594B', '#7C8CF8', '#00A396', '#2F9BFF', '#9BDB3E'];
const FROM = ['Current', '30-59 DPD', '60-89 DPD', '90+ DPD'];
const TO = ['Current', '30-59', '60-89', '90+', 'Charged off'];

export default function Risk() {
  const src = useSource();
  const { data: a, error } = useLoad(src, (s) => s.aggregates());
  const [window6, setWindow6] = useState(true);
  if (error) return <ErrorNote message={error} />;

  const matrix = a ? (window6 ? a.roll.sixMonths : a.roll.lastMonth) : null;
  const rates = matrix ? rollRates(matrix) : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Credit & portfolio risk" title="Where losses come from"
        subtitle="Month-end delinquency by FICO band, cumulative charge-offs by vintage, how accounts roll between delinquency buckets, and whether the origination mix explains it. Every series is computed from the same contract-level rows the semantic view governs."
        right={<Powered>Semantic View AUTO_FINANCE_SV</Powered>} />

      <section className="card p-5">
        <h2 className="font-bold">30+ DPD rate by FICO band</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>Share of open contracts 30 or more days past due at month-end. The 580-619 band is the only one rising.</p>
        <div className="h-[300px]">
          {a ? (
            <ResponsiveContainer>
              <LineChart data={dpdSeries(a)} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} interval={2} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={40} />
                <Tooltip formatter={(v) => fmtPct(Number(v))} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                {a.bands.map((b, i) => <Line key={b} type="monotone" dataKey={b} name={`FICO ${b}`} stroke={BAND_COLORS[i]} strokeWidth={b === '580-619' ? 3.5 : 1.8} strokeOpacity={b === '580-619' ? 1 : 0.7} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          ) : <Skeleton h={300} />}
        </div>
      </section>

      <section id="vintage" className="grid xl:grid-cols-2 gap-4 scroll-mt-20">
        <div className="card p-5">
          <h2 className="font-bold">Cumulative charge-offs by vintage</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>Charged-off balance as a share of original funded balance, by months on book. One line per funding quarter; each stops where its youngest loans stop.</p>
          <div className="h-[300px]">
            {a ? (
              <ResponsiveContainer>
                <LineChart data={vintageCurves(a)} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="mob" tickLine={false} axisLine={false} label={{ value: 'Months on book', position: 'insideBottom', offset: -2, fontSize: 11 }} height={34} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} width={46} />
                  <Tooltip formatter={(v) => fmtPct(Number(v), 2)} labelFormatter={(l) => `Month ${l} on book`} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                  {QUARTER_LABELS.slice(0, 6).map((q, i) => <Line key={q} type="monotone" dataKey={q} stroke={VINTAGE_COLORS[i]} strokeWidth={i === 1 ? 3.2 : 1.8} dot={false} connectNulls={false} />)}
                </LineChart>
              </ResponsiveContainer>
            ) : <Skeleton h={300} />}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Segment check: used-vehicle 84-month loans</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>The Feb-Apr 2025 vintage looked worse overall. Splitting it out shows the problem sits in long-term used loans booked those three months.</p>
          <div className="h-[300px]">
            {a ? (
              <ResponsiveContainer>
                <LineChart data={segmentCurves(a)} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="mob" tickLine={false} axisLine={false} label={{ value: 'Months on book', position: 'insideBottom', offset: -2, fontSize: 11 }} height={34} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={40} />
                  <Tooltip formatter={(v) => fmtPct(Number(v), 2)} labelFormatter={(l) => `Month ${l} on book`} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="weak" name={a.segment[0].label} stroke="#F2594B" strokeWidth={3.2} dot={false} />
                  <Line type="monotone" dataKey="other" name={a.segment[1].label.replace(', booked', ', other months')} stroke="#00A396" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Skeleton h={300} />}
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.1fr_1fr] gap-4">
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-bold">Roll rates</h2>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Where accounts in each bucket stand one month later. Rows sum to 100%.</p>
            </div>
            <div className="seg" role="group" aria-label="Window">
              <button className={window6 ? 'on' : ''} onClick={() => setWindow6(true)} aria-pressed={window6}>Last 6 months</button>
              <button className={!window6 ? 'on' : ''} onClick={() => setWindow6(false)} aria-pressed={!window6}>Sep → Oct 2026</button>
            </div>
          </div>
          {!rates || !matrix ? <Skeleton h={220} /> : (
            <div className="overflow-x-auto">
              <table className="table roll">
                <thead><tr><th>From \ to</th>{TO.map((t) => <th key={t} className="text-right">{t}</th>)}<th className="text-right">Accounts</th></tr></thead>
                <tbody>
                  {FROM.map((f, i) => (
                    <tr key={f}>
                      <td className="font-semibold">{f}</td>
                      {rates[i].map((r, j) => {
                        const bad = j > i && j > 0, cure = j === 0 && i > 0;
                        const tone = bad ? 'var(--coral)' : cure ? 'var(--good)' : 'var(--sky)';
                        return (
                          <td key={j} className="text-right tabular-nums" style={{ background: r ? `color-mix(in srgb, ${tone} ${Math.round(8 + r * 52)}%, transparent)` : undefined, fontWeight: r > 0.3 ? 700 : 500 }}>
                            {r ? fmtPct(r, r < 0.01 ? 2 : 1) : '·'}
                          </td>
                        );
                      })}
                      <td className="text-right tabular-nums" style={{ color: 'var(--text-3)' }}>{fmtInt(matrix[i].reduce((s, v) => s + v, 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-2)' }}>
                About {fmtPct(rates[1][2], 0)} of accounts 30-59 days late roll to 60-89 the next month, and {fmtPct(rates[3][4], 0)} of 90+ accounts charge off.
                Green cells are cures; red cells are roll-forwards.
              </p>
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Origination mix by funding quarter</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>Share of funded contracts. Bars: 84-month terms. Lines: LTV above 120% and FICO 580-619. The mix is steady, so the 580-619 rise is performance, not volume.</p>
          <div className="h-[280px]">
            {a ? (
              <ResponsiveContainer>
                <ComposedChart data={mixSeries(a)} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="quarter" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={40} />
                  <Tooltip formatter={(v) => fmtPct(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="term84" name="84-month term" fill="#6A78F0" fillOpacity={0.35} radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="ltv120" name="LTV above 120%" stroke="#F0A20B" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="subprime" name="FICO 580-619" stroke="#F2594B" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <Skeleton h={280} />}
          </div>
        </div>
      </section>
    </div>
  );
}
