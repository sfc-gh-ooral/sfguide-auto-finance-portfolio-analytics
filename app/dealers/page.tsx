'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, CarFront, Search, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLoad, useSource } from '@/lib/source';
import type { DealerSummary } from '@/lib/types';
import { fmtInt, fmtPct, fmtUsd } from '@/lib/utils';
import { ErrorNote, PageHeader, Powered, Skeleton } from '@/components/Badges';

type Sort = 'funded' | 'apps' | 'change' | 'decline' | 'fpd';
const fpdRate = (d: { fpd2026: number; funded2026: number }) => (d.funded2026 ? d.fpd2026 / d.funded2026 : 0);

export default function Dealers() {
  const src = useSource();
  const { data, error } = useLoad(src, (s) => s.dealers());
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('All');
  const [sort, setSort] = useState<Sort>('funded');
  const rows = useMemo(() => {
    const list = (data ?? []).filter((d) => (region === 'All' || d.region === region) && (!q || `${d.name} ${d.rm} ${d.state}`.toLowerCase().includes(q.toLowerCase())));
    const key = { funded: (d: (typeof list)[number]) => d.fundedCents, apps: (d: (typeof list)[number]) => d.apps,
      change: (d: (typeof list)[number]) => d.declineRecent - d.declinePrior, decline: (d: (typeof list)[number]) => d.declineRecent,
      fpd: (d: (typeof list)[number]) => (d.funded2026 >= 60 ? fpdRate(d) : -1) }[sort];
    return [...list].sort((a, b) => key(b) - key(a));
  }, [data, q, region, sort]);
  const watch = useMemo(() => {
    const rise = (d: DealerSummary) => d.declineRecent - d.declinePrior;
    const all = [...(data ?? [])].filter((d) => d.apps > 900).sort((a, b) => rise(b) - rise(a));
    // Among high-volume dealers a rise is meaningful; small dealers swing more by chance.
    const big = [...(data ?? [])].sort((a, b) => b.apps - a.apps).slice(0, 50).sort((a, b) => rise(b) - rise(a))[0];
    return big ? [big, ...all.filter((d) => d.id !== big.id).slice(0, 1)] : all.slice(0, 2);
  }, [data]);
  const fpdWatch = useMemo(() => [...(data ?? [])].filter((d) => d.funded2026 >= 100).sort((a, b) => fpdRate(b) - fpdRate(a))[0], [data]);
  const bookFpd = useMemo(() => { const l = data ?? []; const f = l.reduce((s, d) => s + d.funded2026, 0); return f ? l.reduce((s, d) => s + d.fpd2026, 0) / f : 0; }, [data]);

  if (error) return <ErrorNote message={error} />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dealer performance" title="Dealer performance"
        subtitle="1,500 synthetic dealers with 24 months of applications, approvals, funding, and early payment performance. Sort by first-payment defaults or the year-over-year change in decline rate to find dealers that need a review."
        right={<Powered>Semantic View AUTO_FINANCE_SV</Powered>} />

      <section>
        <div className="eyebrow mb-2">Watchlist: highest first-payment defaults (2026) and biggest rise in decline rate</div>
        <div className="grid md:grid-cols-3 gap-4 stagger">
          {!data ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} h={120} />) : <>
            {fpdWatch && (
              <Link href={`/dealers/view?id=${fpdWatch.id}`} className="card card-hover p-5 relative overflow-hidden group">
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--indigo)' }}><AlertTriangle className="w-4 h-4" aria-hidden />First-payment defaults, Jan-Sep 2026</div>
                <div className="mt-2 font-bold text-lg">{fpdWatch.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{fpdWatch.state} · {fpdWatch.region} · RM {fpdWatch.rm}</div>
                <div className="mt-3 text-sm"><strong style={{ color: 'var(--coral)' }}>{fmtPct(fpdRate(fpdWatch))}</strong> vs {fmtPct(bookFpd)} for the book</div>
                <ArrowUpRight className="absolute right-4 bottom-4 w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: 'var(--teal)' }} aria-hidden />
              </Link>
            )}
            {watch.map((d, i) => (
              <Link key={d.id} href={`/dealers/view?id=${d.id}`} className="card card-hover p-5 relative overflow-hidden group">
                <span className="absolute right-4 top-4 text-5xl font-black opacity-[0.07] display" aria-hidden>{i + 2}</span>
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--coral)' }}><TrendingUp className="w-4 h-4" aria-hidden />{d.declineRecent >= d.declinePrior ? '+' : ''}{((d.declineRecent - d.declinePrior) * 100).toFixed(1)} pts decline rate</div>
                <div className="mt-2 font-bold text-lg">{d.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{d.state} · {d.region} · RM {d.rm}</div>
                <div className="mt-3 text-sm">{fmtPct(d.declinePrior)} → <strong style={{ color: 'var(--coral)' }}>{fmtPct(d.declineRecent)}</strong> <span style={{ color: 'var(--text-3)' }}>May-Oct 2026 vs a year earlier</span></div>
                <ArrowUpRight className="absolute right-4 bottom-4 w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: 'var(--teal)' }} aria-hidden />
              </Link>
            ))}</>}
        </div>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} aria-hidden />
            <input className="input !pl-9" placeholder="Search dealer, state, or relationship manager" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dealers" />
          </div>
          <select className="input !w-auto" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
            {['All', 'Southeast', 'Southwest', 'Midwest', 'Northeast', 'West'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
            <option value="funded">Sort: funded volume</option><option value="apps">Sort: applications</option>
            <option value="fpd">Sort: first-payment defaults</option><option value="change">Sort: decline-rate change</option><option value="decline">Sort: recent decline rate</option>
          </select>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{fmtInt(rows.length)} dealers</span>
        </div>
        {!data ? <div className="p-4"><Skeleton h={400} /></div> : (
          <div className="max-h-[640px] overflow-auto">
            <table className="table">
              <thead><tr><th>Dealer</th><th>Region</th><th>Applications</th><th>Approval</th><th>Look-to-book</th><th>Funded</th><th>FPD 2026</th><th>Decline trend</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((d) => {
                  const ch = Math.round((d.declineRecent - d.declinePrior) * 1000) / 1000 || 0;
                  return (
                    <tr key={d.id}>
                      <td><Link href={`/dealers/view?id=${d.id}`} className="flex items-center gap-2 font-semibold hover:underline"><CarFront className="w-4 h-4" style={{ color: 'var(--teal)' }} aria-hidden />{d.name}</Link>
                        <div className="text-xs pl-6" style={{ color: 'var(--text-3)' }}>{d.type} · RM {d.rm}</div></td>
                      <td>{d.region} · {d.state}</td>
                      <td className="tabular-nums">{fmtInt(d.apps)}</td>
                      <td className="tabular-nums">{fmtPct(d.approved / Math.max(1, d.apps))}</td>
                      <td className="tabular-nums">{fmtPct(d.funded / Math.max(1, d.approved))}</td>
                      <td className="tabular-nums font-semibold">{fmtUsd(d.fundedCents / 100)}</td>
                      <td className="tabular-nums" style={{ color: fpdRate(d) > bookFpd * 3 && d.funded2026 >= 60 ? 'var(--coral)' : 'var(--text-2)' }}>{d.funded2026 ? fmtPct(fpdRate(d)) : '—'}</td>
                      <td className="tabular-nums" style={{ color: ch > 0.05 ? 'var(--coral)' : ch < -0.05 ? 'var(--good)' : 'var(--text-2)' }}>{ch >= 0 ? '+' : ''}{(ch * 100).toFixed(1)} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 200 && <p className="p-3 text-xs text-center" style={{ color: 'var(--text-3)' }}>Showing the first 200. Search or filter to narrow the list.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
