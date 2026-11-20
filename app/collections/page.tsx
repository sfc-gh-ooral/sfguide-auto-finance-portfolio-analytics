'use client';

import Link from 'next/link';
import { Headset, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLoad, useSource } from '@/lib/source';
import { fmtInt, fmtUsd } from '@/lib/utils';
import { ErrorNote, PageHeader, Powered, Skeleton } from '@/components/Badges';
import { History, ScoreBar } from '@/components/Account';

export default function CollectionsQueue() {
  const src = useSource();
  const { data, error } = useLoad(src, (s) => s.collections());
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [band, setBand] = useState('All');
  const rows = useMemo(() => (data?.accounts ?? []).filter((a) =>
    (status === 'All' || a.state === status) && (band === 'All' || a.band === band)
    && (!q || `${a.borrower} ${a.dealer} ${a.id}`.toLowerCase().includes(q.toLowerCase()))), [data, q, status, band]);

  if (error) return <ErrorNote message={error} />;
  const acc = data?.accounts ?? [];
  const late60 = acc.filter((a) => a.state === '60-89 DPD').length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Collections" title="Early-delinquency work queue"
        subtitle="Accounts 30 to 89 days past due at the October 2026 month-end, ranked by a transparent roll-risk score: days past due, credit band, LTV, term, and loan age. Open an account for an AI call summary, then assign a collector or record a promise to pay."
        right={<div className="flex flex-wrap gap-2"><Powered>COLLECTIONS_QUEUE view</Powered><Powered>AI_COMPLETE</Powered></div>} />

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        {[
          ['Accounts in queue', data ? fmtInt(data.queueSize) : '…', 'All 30-89 DPD accounts, Oct 2026'],
          ['Shown below', data ? fmtInt(acc.length) : '…', 'Highest roll-risk first'],
          ['60-89 DPD in this list', data ? fmtInt(late60) : '…', 'One step from 90+'],
          ['Balance in this list', data ? fmtUsd(acc.reduce((s, a) => s + a.balance, 0)) : '…', 'Outstanding, month-end'],
        ].map(([l, v, sub]) => (
          <div key={l} className="card p-4">
            <div className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>{l}</div>
            <div className="mt-2 text-[26px] font-bold tabular-nums display">{v}</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</div>
          </div>
        ))}
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} aria-hidden />
            <input className="input !pl-9" placeholder="Search borrower, dealer, or contract" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search accounts" />
          </div>
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            {['All', '30-59 DPD', '60-89 DPD'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input !w-auto" value={band} onChange={(e) => setBand(e.target.value)} aria-label="FICO band">
            {['All', '<580', '580-619', '620-679', '680-739', '740+'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All FICO bands' : `FICO ${s}`}</option>)}
          </select>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{fmtInt(rows.length)} accounts</span>
        </div>
        {!data ? <div className="p-4"><Skeleton h={420} /></div> : (
          <div className="max-h-[680px] overflow-auto">
            <table className="table">
              <thead><tr><th>Borrower</th><th>Status</th><th>Roll-risk</th><th>Balance</th><th>Last 12 months</th><th>Loan</th><th>Dealer</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/collections/view?id=${a.id}`} className="flex items-center gap-2 font-semibold hover:underline"><Headset className="w-4 h-4 shrink-0" style={{ color: 'var(--teal)' }} aria-hidden />{a.borrower}</Link>
                      <div className="text-xs pl-6 mono" style={{ color: 'var(--text-3)' }}>#{a.id}</div></td>
                    <td><span className={`dpd ${a.state === '60-89 DPD' ? 'dpd-60' : 'dpd-30'}`}>{a.state}</span></td>
                    <td className="min-w-[130px]"><ScoreBar score={a.score} /></td>
                    <td className="tabular-nums font-semibold">${fmtInt(a.balance)}</td>
                    <td><History history={a.history} compact /></td>
                    <td className="text-xs whitespace-nowrap">{a.newUsed} · {a.term} mo · FICO {a.band}<div style={{ color: 'var(--text-3)' }}>LTV {a.ltv}% · {a.mob} mo on book</div></td>
                    <td className="text-xs"><Link href={`/dealers/view?id=${a.dealerId}`} className="hover:underline">{a.dealer}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <p className="p-3 text-xs text-center" style={{ color: 'var(--text-3)' }}>Showing the first 200. Search or filter to narrow the list.</p>}
          </div>
        )}
      </section>
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>The score is a simple, explainable ranking for this example, not a credit model. Synthetic borrowers only.</p>
    </div>
  );
}
