'use client';

import Link from 'next/link';
import { Activity, ArrowRight, BadgeDollarSign, CalendarClock, CarFront, Landmark, Percent, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLoad, useSource } from '@/lib/source';
import { kpis, lossTrend, stories, trend } from '@/lib/derive';
import { fmtInt, fmtMonthLong, fmtPct, fmtUsd } from '@/lib/utils';
import { ErrorNote, Powered, Skeleton } from '@/components/Badges';
import { CountUp, Kpi } from '@/components/Kpi';

const pts = (d: number, dp = 1) => `${(Math.abs(d) * 100).toFixed(dp)} pts`;

export default function Overview() {
  const src = useSource();
  const agg = useLoad(src, (s) => s.aggregates());
  const dealers = useLoad(src, (s) => s.dealers());

  if (agg.error) return <ErrorNote message={agg.error} />;
  const a = agg.data;
  const k = a ? kpis(a) : null;
  const st = a ? stories(a, dealers.data ?? null) : null;

  return (
    <div className="space-y-6">
      <section className="hero p-7 sm:p-9 fade-up">
        <div className="relative z-10 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] px-3 py-1 rounded-full mb-4"
              style={{ background: 'rgba(155,219,62,0.14)', color: '#C8F08C', border: '1px solid rgba(155,219,62,0.3)' }}>
              <Activity className="w-3.5 h-3.5" aria-hidden />Auto finance · portfolio analytics
            </div>
            <h1 className="text-3xl sm:text-[40px] leading-[1.08] font-bold text-white">
              See the whole lending book.<br /><span className="grad-text">Act on what moves.</span>
            </h1>
            <p className="mt-4 text-[15px] max-w-xl" style={{ color: '#B5CEC7' }}>
              Originations, delinquency, and charge-offs in one place for risk, collections, dealer, and finance teams.
              Vintage curves and roll rates show where losses come from, the collections queue ranks who to call
              first, and anyone can ask the governed semantic view a question in plain English.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/risk" className="btn btn-primary">Open credit risk <ArrowRight className="w-4 h-4" aria-hidden /></Link>
              <Link href="/collections" className="btn" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.18)' }}>Work the collections queue</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Funded contracts, 24 months', v: a ? a.monthly.reduce((s, m) => s + m.funded, 0) : 0, f: (n: number) => fmtInt(n), icon: CarFront },
              { label: 'Open balance, Oct 2026', v: k?.balanceUsd.value ?? 0, f: (n: number) => fmtUsd(n), icon: Landmark },
              { label: 'Accounts in the collections queue', v: a?.queueSize ?? 0, f: (n: number) => fmtInt(n), icon: CalendarClock },
            ].map(({ label, v, f, icon: Icon }) => (
              <div key={label} className="min-w-0 rounded-2xl p-3 sm:p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Icon className="w-4 h-4 mb-3" style={{ color: '#9BDB3E' }} aria-hidden />
                <div className="text-base sm:text-2xl font-bold text-white tabular-nums">{a ? <CountUp value={v} format={f} /> : '…'}</div>
                <div className="text-[11px] mt-1 leading-snug" style={{ color: '#9DB9B1' }}>{label}</div>
              </div>
            ))}
            <p className="col-span-3 text-[11px]" style={{ color: '#7FA197' }}>Synthetic book: 1.2M applications, Nov 2024 to Oct 2026.</p>
          </div>
        </div>
      </section>

      {!k ? <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={118} />)}</div> : (
        <section aria-label={`Key metrics, ${fmtMonthLong(k.month)}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold">{fmtMonthLong(k.month)} at a glance</h2>
            <Powered>Semantic View AUTO_FINANCE_SV</Powered>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 stagger">
            <Kpi label="Funded volume" value={k.fundedUsd.value} format={(n) => fmtUsd(n)} delta={k.fundedUsd.delta} deltaFormat={(d) => fmtPct(Math.abs(d))} icon={<BadgeDollarSign className="w-4 h-4" />} accent="var(--good)" />
            <Kpi label="Open balance" value={k.balanceUsd.value} format={(n) => fmtUsd(n)} delta={k.balanceUsd.delta} deltaFormat={(d) => fmtPct(Math.abs(d))} icon={<Landmark className="w-4 h-4" />} accent="var(--sky)" />
            <Kpi label="Average APR (yield)" value={k.apr.value} format={(n) => `${n.toFixed(2)}%`} delta={k.apr.delta / 100} deltaFormat={(d) => pts(d, 2)} icon={<Percent className="w-4 h-4" />} accent="var(--indigo)" />
            <Kpi label="Look-to-book" value={k.l2b.value} format={(n) => fmtPct(n)} delta={k.l2b.delta} deltaFormat={(d) => pts(d)} icon={<CarFront className="w-4 h-4" />} accent="var(--teal)" />
            <Kpi label="30+ DPD rate" value={k.dpd30.value} format={(n) => fmtPct(n, 2)} delta={k.dpd30.delta} deltaFormat={(d) => pts(d, 2)} goodWhenUp={false} icon={<CalendarClock className="w-4 h-4" />} accent="var(--amber)" />
            <Kpi label="Charge-offs (annualized)" value={k.chargeOff.value} format={(n) => fmtPct(n, 2)} delta={k.chargeOff.delta} deltaFormat={(d) => pts(d, 2)} goodWhenUp={false} icon={<TrendingDown className="w-4 h-4" />} accent="var(--coral)" />
          </div>
        </section>
      )}

      <section className="grid xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold">Originations and open balance</h2>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>24 months. Area: funded volume, $M per month. Line: open balance at month-end, $B.</p>
            </div>
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--teal)' }} aria-hidden />
          </div>
          <div className="h-[280px]">
            {a ? (
              <ResponsiveContainer>
                <ComposedChart data={trend(a)} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-fund" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00A396" stopOpacity={0.55} /><stop offset="1" stopColor="#00A396" stopOpacity={0.04} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} interval={2} />
                  <YAxis yAxisId="l" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}M`} width={58} />
                  <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}B`} width={46} />
                  <Tooltip formatter={(v, n) => (n === 'Open balance' ? `$${Number(v).toFixed(2)}B` : `$${Number(v).toFixed(1)}M`)} />
                  <Area yAxisId="l" type="monotone" dataKey="fundedM" name="Funded" stroke="#00A396" strokeWidth={2.5} fill="url(#g-fund)" />
                  <Line yAxisId="r" type="monotone" dataKey="balanceB" name="Open balance" stroke="#6A78F0" strokeWidth={2.5} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <Skeleton h={280} />}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold">Delinquency and charge-offs</h2>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Month-end 30+ DPD rate and annualized charge-off rate (no recoveries modeled).</p>
            </div>
            <TrendingDown className="w-5 h-5" style={{ color: 'var(--coral)' }} aria-hidden />
          </div>
          <div className="h-[280px]">
            {a ? (
              <ResponsiveContainer>
                <ComposedChart data={lossTrend(a)} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} interval={2} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} width={48} />
                  <Tooltip formatter={(v) => fmtPct(Number(v), 2)} />
                  <Line type="monotone" dataKey="dpd30" name="30+ DPD rate" stroke="#F0A20B" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="chargeOff" name="Charge-off rate" stroke="#F2594B" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <Skeleton h={280} />}
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold">What stands out</h2>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Findings planted in this synthetic data set</span>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4 stagger">
          <Story href="/risk" tone="var(--amber)" kicker="Credit risk"
            title={st ? `580-619 band 30+ DPD: ${fmtPct(st.subprime.start)} → ${fmtPct(st.subprime.end)}` : '30+ DPD creeping up in one band'}
            body="The other FICO bands ease over the same 12 months." />
          <Story href="/risk#vintage" tone="var(--coral)" kicker="Vintage"
            title={st ? `Feb-Apr 2025 used 84-month loans: ${fmtPct(st.vintage.weak)} charged off` : 'One vintage is losing far more'}
            body={st ? `By month 15 on book, against ${fmtPct(st.vintage.other)} for comparable used 84-month loans.` : 'Compared with comparable loans at the same age.'} />
          <Story href={st?.harbor ? `/dealers/view?id=${st.harbor.id}` : '/dealers'} tone="var(--indigo)" kicker="Dealer"
            title={st?.harbor ? `Harbor Pre-Owned: ${fmtPct(st.harbor.rate)} first-payment defaults` : 'One dealer has a first-payment-default cluster'}
            body={st?.harbor ? `Against ${fmtPct(st.harbor.book)} for the whole book, on contracts funded Jan-Sep 2026.` : 'Against the whole book.'} />
          <Story href={st?.sunbelt ? `/dealers/view?id=${st.sunbelt.id}` : '/dealers'} tone="var(--teal)" kicker="Originations"
            title={st?.sunbelt ? `Sunbelt Motors Group declines: ${fmtPct(st.sunbelt.prior, 0)} → ${fmtPct(st.sunbelt.recent, 0)}` : 'Sunbelt Motors Group declines are rising'}
            body="Used-vehicle LTV has crept above the 120% policy line." />
          <Story href="/ask?q=How%20does%20look-to-book%20compare%20on%20weekends%20versus%20weekdays%3F" tone="var(--sky)" kicker="Funding"
            title={st ? `Weekend look-to-book ${fmtPct(st.weekend.weekend, 0)} vs ${fmtPct(st.weekend.weekday, 0)} weekdays` : 'Weekend look-to-book drops'}
            body="Approved deals submitted on Saturday and Sunday fund far less often." />
        </div>
      </section>
    </div>
  );
}

function Story({ href, tone, kicker, title, body }: { href: string; tone: string; kicker: string; title: string; body: string }) {
  return (
    <Link href={href} className="card card-hover p-5 block group relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} aria-hidden />
      <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: tone }}>{kicker}</div>
      <div className="mt-2 font-bold leading-snug">{title}</div>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--teal-strong)' }}>Explore <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden /></span>
    </Link>
  );
}
