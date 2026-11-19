import type { Account, Aggregates, CurveRow, Dealer, DealerSummary } from './types';
import { div, fmtMonth, fmtPct, fmtUsd, sum } from './utils';

// Pure derivations shared by Sample and Live mode.

const coRate = (m: Aggregates['monthly'][number]) => div(m.chargeOffCents * 12, m.activeBalanceCents); // annualized

export function kpis(a: Aggregates) {
  const m = a.monthly, last = m[m.length - 1], prev = m[m.length - 2];
  const apr = (r: typeof last) => div(r.aprBpsSum, r.funded) / 100;
  return {
    month: last.month,
    fundedUsd: { value: last.fundedCents / 100, delta: div(last.fundedCents - prev.fundedCents, prev.fundedCents) },
    balanceUsd: { value: last.activeBalanceCents / 100, delta: div(last.activeBalanceCents - prev.activeBalanceCents, prev.activeBalanceCents) },
    dpd30: { value: div(last.dpd30, last.active), delta: div(last.dpd30, last.active) - div(prev.dpd30, prev.active) },
    chargeOff: { value: coRate(last), delta: coRate(last) - coRate(prev) },
    apr: { value: apr(last), delta: apr(last) - apr(prev) },
    l2b: { value: div(last.funded, last.approved), delta: div(last.funded, last.approved) - div(prev.funded, prev.approved) },
  };
}

export function trend(a: Aggregates) {
  return a.monthly.map((m) => ({
    month: fmtMonth(m.month), fundedM: Math.round(m.fundedCents / 1e6) / 100,
    balanceB: m.activeBalanceCents ? Math.round(m.activeBalanceCents / 1e8) / 100 : null,
    approvalRate: div(m.approved, m.apps), l2b: div(m.funded, m.approved),
  }));
}

// Months 0-1 have almost no seasoned loans, so loss charts start at month 2.
export function lossTrend(a: Aggregates) {
  return a.monthly.slice(2).map((m) => ({ month: fmtMonth(m.month), dpd30: div(m.dpd30, m.active), chargeOff: coRate(m) }));
}

export function dowSeries(a: Aggregates) {
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return order.map((d) => { const r = a.dow.find((x) => x.dow === d)!; return { dow: d, l2b: div(r.funded, r.approved), weekend: d === 'Sat' || d === 'Sun' }; });
}

export function dpdSeries(a: Aggregates) {
  return a.months.slice(2).map((m, j) => {
    const i = j + 2;
    const row: Record<string, number | string> = { month: fmtMonth(m) };
    for (const b of a.band) row[b.band] = div(b.dpd30[i], b.active[i]);
    return row;
  });
}

// Cumulative charge-offs as a share of original funded balance, by month on book.
export function cumulative(c: CurveRow, maxMob: number) {
  let t = 0;
  return Array.from({ length: maxMob + 1 }, (_, k) => { t += c.chargeOffCents[k] ?? 0; return div(t, c.fundedCents); });
}
export const QUARTER_LABELS = ['Nov 24-Jan 25', 'Feb-Apr 25', 'May-Jul 25', 'Aug-Oct 25', 'Nov 25-Jan 26', 'Feb-Apr 26', 'May-Jul 26', 'Aug-Oct 26'];
export function vintageCurves(a: Aggregates) {
  // A quarter's loans are observed up to month on book 23 - (first month of the quarter) - 2.
  const shown = a.vintage.slice(0, 6);
  const maxMob = 21;
  return Array.from({ length: maxMob }, (_, j) => {
    const k = j + 1;
    const row: Record<string, number | null> = { mob: k };
    shown.forEach((v) => { row[QUARTER_LABELS[v.quarter]] = k <= 23 - v.quarter * 3 - 2 ? cumulative(v, k)[k] : null; });
    return row;
  });
}
export function segmentCurves(a: Aggregates) {
  const [weak, other] = a.segment;
  return Array.from({ length: 15 }, (_, j) => ({ mob: j + 1, weak: cumulative(weak, j + 1)[j + 1], other: cumulative(other, j + 1)[j + 1] }));
}

export function rollRates(m: number[][]) {
  return m.map((row) => { const t = sum(row); return row.map((v) => div(v, t)); });
}

export function mixSeries(a: Aggregates) {
  // Funded-unit mix by quarter: 84-month share, LTV above 120% share, 580-619 share.
  return [0, 1, 2, 3, 4, 5, 6, 7].map((q) => {
    const months = [q * 3, q * 3 + 1, q * 3 + 2];
    const tot = sum(months.map((i) => a.monthly[i].funded));
    return {
      quarter: QUARTER_LABELS[q],
      term84: div(sum(months.map((i) => a.termFunded[4][i])), tot),
      ltv120: div(sum(months.map((i) => a.ltvFunded[2][i])), tot),
      subprime: div(sum(months.map((i) => a.band[1].funded[i])), tot),
    };
  });
}

export function stories(a: Aggregates, dealers: DealerSummary[] | null) {
  const dow = dowSeries(a);
  const we = dow.filter((d) => d.weekend), wd = dow.filter((d) => !d.weekend);
  const avg = (x: { l2b: number }[]) => sum(x.map((v) => v.l2b)) / x.length;
  const sub = a.band.find((b) => b.band === '580-619')!;
  const fpdBook = dealers ? div(sum(dealers.map((d) => d.fpd2026)), sum(dealers.map((d) => d.funded2026))) : 0;
  const harbor = dealers?.find((d) => d.name === 'Harbor Pre-Owned');
  const sunbelt = dealers?.find((d) => d.name === 'Sunbelt Motors Group');
  const [weak, other] = a.segment;
  return {
    weekend: { weekend: avg(we), weekday: avg(wd) },
    subprime: { start: div(sub.dpd30[12], sub.active[12]), end: div(sub.dpd30[23], sub.active[23]) },
    vintage: { weak: cumulative(weak, 15)[15], other: cumulative(other, 15)[15] }, // every loan in both groups is observed to MOB 15
    harbor: harbor ? { id: harbor.id, rate: div(harbor.fpd2026, harbor.funded2026), book: fpdBook } : null,
    sunbelt: sunbelt ? { id: sunbelt.id, recent: sunbelt.declineRecent, prior: sunbelt.declinePrior } : null,
  };
}

export function summarize(d: Dealer): DealerSummary {
  const recA = sum(d.apps.slice(18)), recAp = sum(d.approved.slice(18));       // May-Oct 2026
  const priA = sum(d.apps.slice(6, 12)), priAp = sum(d.approved.slice(6, 12)); // May-Oct 2025
  return {
    id: d.id, name: d.name, region: d.region, state: d.state, type: d.type, rm: d.rm,
    apps: sum(d.apps), approved: sum(d.approved), funded: sum(d.funded), fundedCents: sum(d.fundedCents),
    declineRecent: recA ? 1 - recAp / recA : 0, declinePrior: priA ? 1 - priAp / priA : 0,
    fpd2026: sum(d.fpd.slice(14, 23)), funded2026: sum(d.funded.slice(14, 23)),
  };
}

export const REVIEW_REASONS = ['First-payment defaults', 'Rising declines', 'LTV above policy', 'Below target'];
export const REASON_COLORS = ['#3BA9FF', '#7C8CF8', '#00B3A4', '#FFB020', '#A3B1BF', '#FF6B5A'];

// Facts the dealer narrative is grounded in (the same list feeds AI_COMPLETE in Live mode).
export function dealerFacts(d: Dealer, bookFpd?: number): string[] {
  const tot = (a: number[], i: number, j: number) => sum(a.slice(i, j));
  const rate = (i: number, j: number) => 1 - div(tot(d.approved, i, j), tot(d.apps, i, j));
  const usedLtv = (i: number, j: number) => div(tot(d.usedLtvSum, i, j), tot(d.usedN, i, j));
  const reasons = ['Credit score', 'Debt-to-income', 'Income verification', 'Vehicle valuation', 'Stipulations not met', 'LTV above policy'];
  const rec = reasons.map((r, i) => [r, d.reasons[i]] as const).sort((x, y) => y[1] - x[1]);
  const fpd25 = div(tot(d.fpd, 2, 11), tot(d.funded, 2, 11)), fpd26 = div(tot(d.fpd, 14, 23), tot(d.funded, 14, 23));
  return [
    `Dealer: ${d.name}, ${d.type.toLowerCase()} dealer in ${d.state} (${d.region}). Relationship manager: ${d.rm}.`,
    `Applications in the last 12 months: ${tot(d.apps, 12, 24)}; funded contracts: ${tot(d.funded, 12, 24)}; funded volume ${fmtUsd(tot(d.fundedCents, 12, 24) / 100)}.`,
    `Decline rate Nov 2024 to Oct 2025: ${fmtPct(rate(0, 12))}. Decline rate Nov 2025 to Oct 2026: ${fmtPct(rate(12, 24))}. Last 3 months: ${fmtPct(rate(21, 24))}.`,
    `Average used-vehicle LTV: ${usedLtv(0, 12).toFixed(1)}% in the first 12 months, ${usedLtv(21, 24).toFixed(1)}% in the last 3 months. Policy line is 120% LTV.`,
    `First-payment default rate (first payment 30+ days late): ${fmtPct(fpd25)} for contracts funded Jan-Sep 2025, ${fmtPct(fpd26)} for Jan-Sep 2026${bookFpd ? ` (whole book Jan-Sep 2026: ${fmtPct(bookFpd)})` : ''}.`,
    `Charged-off balance on this dealer's contracts, 24 months: ${fmtUsd(d.chargeOffCents / 100)}.`,
    `Top decline reasons overall: ${rec.slice(0, 3).map(([r, n]) => `${r} (${n})`).join(', ')}.`,
    `Monthly funded-unit target: ${d.targetMonthlyUnits}; average funded units per month in the last 3 months: ${(tot(d.funded, 21, 24) / 3).toFixed(1)}.`,
  ];
}

// Roll-risk score parts (same points as COLLECTIONS_QUEUE in sql/setup.sql).
export function scoreParts(a: Account) {
  const b = ['<580', '580-619', '620-679', '680-739', '740+'].indexOf(a.band);
  return [
    { label: a.state === '60-89 DPD' ? '60-89 days past due' : '30-59 days past due', pts: a.state === '60-89 DPD' ? 45 : 25 },
    { label: `FICO band ${a.band}`, pts: [20, 16, 10, 5, 2][b] },
    { label: `LTV ${a.ltv}%`, pts: a.ltv > 120 ? 10 : a.ltv > 110 ? 5 : 0 },
    { label: `${a.term}-month term`, pts: a.term >= 84 ? 8 : a.term >= 72 ? 4 : 0 },
    { label: `${a.mob} months on book`, pts: a.mob <= 6 ? 8 : 0 },
  ];
}

export function accountFacts(a: Account): string[] {
  const pastDue = a.state === '60-89 DPD' ? 2 : 1;
  const prior = a.history.slice(0, -1).filter((s) => s !== 'Current').length;
  return [
    `Borrower: ${a.borrower} (synthetic). Contract ${a.id}, funded ${a.fundedMonth} through ${a.dealer}.`,
    `Status at Oct 2026 month-end: ${a.state}. About ${pastDue} monthly payment${pastDue > 1 ? 's' : ''} of $${a.payment.toFixed(2)} past due.`,
    `Outstanding balance $${a.balance.toFixed(2)} on an original $${a.amount.toFixed(2)} ${a.newUsed.toLowerCase()}-vehicle loan, ${a.term} months at ${a.apr.toFixed(2)}% APR, ${a.mob} months on book.`,
    `Origination: FICO band ${a.band}, LTV ${a.ltv}%.`,
    `Month-end status history (oldest first): ${a.history.join(', ')}. Prior delinquent months in this window: ${prior}.`,
    `Roll-risk score ${a.score} (scale 0 to 91) from: ${scoreParts(a).filter((p) => p.pts).map((p) => `${p.label} (+${p.pts})`).join(', ')}.`,
  ];
}
