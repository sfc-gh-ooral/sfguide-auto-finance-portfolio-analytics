import { executeQuery } from './snowflake';
import type { Account, ActionRecord, Aggregates, Collections, Dealer, DealerSummary } from './types';

// Live-mode queries. Each returns the same shape as the bundled Sample data, so the screens and
// derivations are shared. Every user-supplied value is a bind variable.
const BANDS = ['<580', '580-619', '620-679', '680-739', '740+'];
const REGIONS = ['Southeast', 'Southwest', 'Midwest', 'Northeast', 'West'];
const REASONS = ['Credit score', 'Debt-to-income', 'Income verification', 'Vehicle valuation', 'Stipulations not met', 'LTV above policy'];
const CHANNELS = ['Dealer portal', 'Partner marketplace', 'Direct'];
const STATES = ['Current', '30-59 DPD', '60-89 DPD', '90+ DPD', 'Charged off'];
const TERMS = [36, 48, 60, 72, 84];
const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLLECTORS = ['Alicia Grant', 'Devon Price', 'Mei Lin', 'Rafael Soto', 'Tara Quinn', 'Will Hammond'];
const n = (v: unknown) => Number(v ?? 0);
const zeros = (len = 24) => Array(len).fill(0) as number[];
const SNAP_I = `DATEDIFF(month, '2024-11-01'::DATE, p.SNAPSHOT_MONTH)`;

type R = Record<string, unknown>;

export async function liveAggregates(): Promise<Aggregates> {
  const [m, port, b, dpd, dow, reg, ch, nu, rs, mix, vint, seg, roll, q] = await Promise.all([
    executeQuery<R>(`SELECT MONTH_INDEX AS I, TO_CHAR(APP_MONTH, 'YYYY-MM') AS M, COUNT(*) AS APPS, COUNT_IF(DECISION = 'APPROVED') AS APPR,
      COUNT_IF(IS_FUNDED) AS FUND, COALESCE(SUM(AMOUNT_FINANCED), 0) * 100 AS CENTS, SUM(DECISION_MINUTES) AS MINS,
      COALESCE(SUM(APR), 0) * 100 AS BPS FROM APPLICATIONS GROUP BY 1, 2 ORDER BY 1`),
    executeQuery<R>(`SELECT ${SNAP_I} AS I, SUM(CHARGE_OFF_AMOUNT) * 100 AS CO, SUM(IFF(STATUS_CODE < 4, BALANCE, 0)) * 100 AS BAL,
      COUNT_IF(STATUS_CODE < 4) AS ACT, COUNT_IF(IS_DPD30) AS DPD FROM PAYMENTS_MONTHLY p GROUP BY 1`),
    executeQuery<R>(`SELECT FICO_BAND_ORDER AS B, MONTH_INDEX AS I, COUNT(*) AS APPS, COUNT_IF(DECISION = 'APPROVED') AS APPR,
      COUNT_IF(IS_FUNDED) AS FUND, COALESCE(SUM(APR), 0) * 100 AS BPS, SUM(DECISION_MINUTES) AS MINS FROM APPLICATIONS GROUP BY 1, 2`),
    executeQuery<R>(`SELECT c.FICO_BAND_ORDER AS B, ${SNAP_I} AS I, COUNT_IF(p.STATUS_CODE < 4) AS ACTIVE, COUNT_IF(p.IS_DPD30) AS DPD
      FROM PAYMENTS_MONTHLY p JOIN CONTRACTS c ON c.CONTRACT_ID = p.CONTRACT_ID GROUP BY 1, 2`),
    executeQuery<R>(`SELECT DAYNAME(APP_DATE) AS D, COUNT(*) AS APPS, COUNT_IF(DECISION = 'APPROVED') AS APPR, COUNT_IF(IS_FUNDED) AS FUND
      FROM APPLICATIONS GROUP BY 1`),
    executeQuery<R>(`SELECT d.REGION AS REG, a.MONTH_INDEX AS I, COUNT(*) AS APPS, COUNT_IF(a.IS_FUNDED) AS FUND,
      COALESCE(SUM(a.AMOUNT_FINANCED), 0) * 100 AS CENTS FROM APPLICATIONS a JOIN DEALERS d ON d.DEALER_ID = a.DEALER_ID GROUP BY 1, 2`),
    executeQuery<R>(`SELECT CHANNEL AS C, COUNT(*) AS APPS, COUNT_IF(DECISION = 'APPROVED') AS APPR, COUNT_IF(IS_FUNDED) AS FUND,
      SUM(DECISION_MINUTES) AS MINS FROM APPLICATIONS GROUP BY 1`),
    executeQuery<R>(`SELECT NEW_USED AS T, COUNT(*) AS APPS, COUNT_IF(IS_FUNDED) AS FUND, COALESCE(SUM(AMOUNT_FINANCED), 0) * 100 AS CENTS,
      SUM(LTV_PCT) AS LTV FROM APPLICATIONS GROUP BY 1`),
    executeQuery<R>(`SELECT DECLINE_REASON AS R, COUNT(*) AS N FROM APPLICATIONS WHERE DECISION = 'DECLINED' GROUP BY 1`),
    executeQuery<R>(`SELECT MONTH_INDEX AS I, TERM_MONTHS AS T, CASE WHEN LTV_PCT > 120 THEN 2 WHEN LTV_PCT > 100 THEN 1 ELSE 0 END AS L,
      COUNT(*) AS N FROM CONTRACTS GROUP BY 1, 2, 3`),
    executeQuery<R>(`SELECT FLOOR(c.MONTH_INDEX / 3) AS Q, p.MONTHS_ON_BOOK AS K, SUM(p.CHARGE_OFF_AMOUNT) * 100 AS CO,
      MAX(f.FUNDED) AS FUNDED FROM PAYMENTS_MONTHLY p JOIN CONTRACTS c ON c.CONTRACT_ID = p.CONTRACT_ID
      JOIN (SELECT FLOOR(MONTH_INDEX / 3) AS Q, SUM(AMOUNT) * 100 AS FUNDED FROM CONTRACTS GROUP BY 1) f ON f.Q = FLOOR(c.MONTH_INDEX / 3)
      GROUP BY 1, 2`),
    executeQuery<R>(`WITH c AS (SELECT CONTRACT_ID, AMOUNT, IFF(MONTH_INDEX BETWEEN 3 AND 5, 0, 1) AS S FROM CONTRACTS
        WHERE NEW_USED = 'Used' AND TERM_MONTHS = 84 AND MONTH_INDEX <= 8)
      SELECT c.S, p.MONTHS_ON_BOOK AS K, SUM(p.CHARGE_OFF_AMOUNT) * 100 AS CO, MAX(f.FUNDED) AS FUNDED
      FROM c JOIN PAYMENTS_MONTHLY p ON p.CONTRACT_ID = c.CONTRACT_ID
      JOIN (SELECT S, SUM(AMOUNT) * 100 AS FUNDED FROM c GROUP BY 1) f ON f.S = c.S GROUP BY 1, 2`),
    executeQuery<R>(`SELECT ${SNAP_I} AS I, PREV AS F, p.STATUS_CODE AS T, COUNT(*) AS N FROM (
        SELECT p.*, LAG(STATUS_CODE) OVER (PARTITION BY CONTRACT_ID ORDER BY MONTHS_ON_BOOK) AS PREV FROM PAYMENTS_MONTHLY p) p
      WHERE PREV IS NOT NULL AND p.SNAPSHOT_MONTH >= '2026-05-01' GROUP BY 1, 2, 3`),
    executeQuery<R>(`SELECT COUNT(*) AS N FROM COLLECTIONS_QUEUE`),
  ]);
  const monthly = m.rows.map((r) => ({ month: String(r.M), apps: n(r.APPS), approved: n(r.APPR), funded: n(r.FUND),
    fundedCents: Math.round(n(r.CENTS)), minutesSum: n(r.MINS), aprBpsSum: Math.round(n(r.BPS)),
    chargeOffCents: 0, activeBalanceCents: 0, active: 0, dpd30: 0 }));
  for (const r of port.rows) {
    const x = monthly[n(r.I)];
    x.chargeOffCents = Math.round(n(r.CO)); x.activeBalanceCents = Math.round(n(r.BAL)); x.active = n(r.ACT); x.dpd30 = n(r.DPD);
  }
  const band = BANDS.map((name) => ({ band: name, apps: zeros(), approved: zeros(), funded: zeros(), aprBpsSum: zeros(), dpd30: zeros(), active: zeros(), minutesSum: 0 }));
  for (const r of b.rows) {
    const x = band[n(r.B)], i = n(r.I);
    x.apps[i] = n(r.APPS); x.approved[i] = n(r.APPR); x.funded[i] = n(r.FUND); x.aprBpsSum[i] = Math.round(n(r.BPS)); x.minutesSum += n(r.MINS);
  }
  for (const r of dpd.rows) { const x = band[n(r.B)], i = n(r.I); x.active[i] = n(r.ACTIVE); x.dpd30[i] = n(r.DPD); }
  const region = REGIONS.map((name) => ({ region: name, apps: zeros(), funded: zeros(), fundedCents: zeros() }));
  for (const r of reg.rows) { const x = region[REGIONS.indexOf(String(r.REG))], i = n(r.I); x.apps[i] = n(r.APPS); x.funded[i] = n(r.FUND); x.fundedCents[i] = Math.round(n(r.CENTS)); }
  const termFunded = TERMS.map(() => zeros()), ltvFunded = [zeros(), zeros(), zeros()];
  for (const r of mix.rows) { termFunded[TERMS.indexOf(n(r.T))][n(r.I)] += n(r.N); ltvFunded[n(r.L)][n(r.I)] += n(r.N); }
  const vintage = Array.from({ length: 8 }, (_, q) => ({ quarter: q, fundedCents: 0, chargeOffCents: zeros() }));
  for (const r of vint.rows) { const v = vintage[n(r.Q)]; v.fundedCents = Math.round(n(r.FUNDED)); v.chargeOffCents[n(r.K)] = Math.round(n(r.CO)); }
  const segment = ['Used 84-month, booked Feb-Apr 2025', 'Other used 84-month, booked Nov 2024-Jul 2025']
    .map((label) => ({ label, fundedCents: 0, chargeOffCents: zeros() }));
  for (const r of seg.rows) { const s = segment[n(r.S)]; s.fundedCents = Math.round(n(r.FUNDED)); s.chargeOffCents[n(r.K)] = Math.round(n(r.CO)); }
  const lastMonth = [0, 1, 2, 3].map(() => zeros(5)), sixMonths = [0, 1, 2, 3].map(() => zeros(5));
  for (const r of roll.rows) { sixMonths[n(r.F)][n(r.T)] += n(r.N); if (n(r.I) === 23) lastMonth[n(r.F)][n(r.T)] += n(r.N); }
  const dowMap = new Map(dow.rows.map((r) => [String(r.D), r]));
  const chMap = new Map(ch.rows.map((r) => [String(r.C), r]));
  const nuMap = new Map(nu.rows.map((r) => [String(r.T), r]));
  const rsMap = new Map(rs.rows.map((r) => [String(r.R), n(r.N)]));
  return {
    months: monthly.map((r) => r.month), bands: BANDS, regions: REGIONS, reasons: REASONS, channels: CHANNELS, states: STATES, terms: TERMS,
    ltvBuckets: ['100% or less', '101-120%', 'Above 120%'],
    monthly, band, region, termFunded, ltvFunded, vintage, segment, roll: { lastMonth, sixMonths }, queueSize: n(q.rows[0]?.N),
    dow: DOWS.map((d) => ({ dow: d, apps: n(dowMap.get(d)?.APPS), approved: n(dowMap.get(d)?.APPR), funded: n(dowMap.get(d)?.FUND) })),
    channel: CHANNELS.map((c) => ({ apps: n(chMap.get(c)?.APPS), approved: n(chMap.get(c)?.APPR), funded: n(chMap.get(c)?.FUND), minutesSum: n(chMap.get(c)?.MINS) })),
    newUsed: ['New', 'Used'].map((t) => ({ type: t, apps: n(nuMap.get(t)?.APPS), funded: n(nuMap.get(t)?.FUND), fundedCents: Math.round(n(nuMap.get(t)?.CENTS)), ltvSum: n(nuMap.get(t)?.LTV) })),
    reasonTotals: REASONS.map((x) => rsMap.get(x) ?? 0),
  };
}

export async function liveDealerSummaries(): Promise<DealerSummary[]> {
  const { rows } = await executeQuery<R>(`SELECT d.DEALER_ID, d.DEALER_NAME, d.REGION, d.STATE, d.DEALER_TYPE, d.RELATIONSHIP_MANAGER,
      COUNT(a.APP_ID) AS APPS, COUNT_IF(a.DECISION = 'APPROVED') AS APPR, COUNT_IF(a.IS_FUNDED) AS FUND,
      COALESCE(SUM(a.AMOUNT_FINANCED), 0) * 100 AS CENTS,
      COUNT_IF(a.MONTH_INDEX >= 18) AS A_RECENT, COUNT_IF(a.MONTH_INDEX >= 18 AND a.DECISION = 'DECLINED') AS D_RECENT,
      COUNT_IF(a.MONTH_INDEX BETWEEN 6 AND 11) AS A_PRIOR, COUNT_IF(a.MONTH_INDEX BETWEEN 6 AND 11 AND a.DECISION = 'DECLINED') AS D_PRIOR,
      MAX(f.FPD) AS FPD, MAX(f.FUNDED) AS F26
    FROM DEALERS d LEFT JOIN APPLICATIONS a ON a.DEALER_ID = d.DEALER_ID
    LEFT JOIN (SELECT DEALER_ID, COUNT_IF(IS_FIRST_PAYMENT_DEFAULT) AS FPD, COUNT(*) AS FUNDED FROM CONTRACTS
               WHERE MONTH_INDEX BETWEEN 14 AND 22 GROUP BY 1) f ON f.DEALER_ID = d.DEALER_ID
    GROUP BY 1, 2, 3, 4, 5, 6 ORDER BY 1`);
  return rows.map((r) => ({
    id: n(r.DEALER_ID), name: String(r.DEALER_NAME), region: String(r.REGION), state: String(r.STATE), type: String(r.DEALER_TYPE),
    rm: String(r.RELATIONSHIP_MANAGER), apps: n(r.APPS), approved: n(r.APPR), funded: n(r.FUND), fundedCents: Math.round(n(r.CENTS)),
    declineRecent: n(r.A_RECENT) ? n(r.D_RECENT) / n(r.A_RECENT) : 0, declinePrior: n(r.A_PRIOR) ? n(r.D_PRIOR) / n(r.A_PRIOR) : 0,
    fpd2026: n(r.FPD), funded2026: n(r.F26),
  }));
}

export async function liveDealer(id: number): Promise<Dealer | null> {
  const [d, m, r, c] = await Promise.all([
    executeQuery<R>(`SELECT DEALER_NAME, REGION, STATE, DEALER_TYPE, RELATIONSHIP_MANAGER, TARGET_MONTHLY_UNITS,
        TO_CHAR(ONBOARDED_DATE, 'YYYY-MM-DD') AS ONBOARDED FROM DEALERS WHERE DEALER_ID = ?`, [id]),
    executeQuery<R>(`SELECT MONTH_INDEX AS I, COUNT(*) AS APPS, COUNT_IF(DECISION = 'APPROVED') AS APPR, COUNT_IF(IS_FUNDED) AS FUND,
        COALESCE(SUM(AMOUNT_FINANCED), 0) * 100 AS CENTS, SUM(IFF(NEW_USED = 'Used', LTV_PCT, 0)) AS ULTV, COUNT_IF(NEW_USED = 'Used') AS UN,
        COUNT_IF(DECLINE_REASON = 'LTV above policy') AS LTVD, COUNT_IF(NEW_USED = 'New') AS NEWN
      FROM APPLICATIONS WHERE DEALER_ID = ? GROUP BY 1`, [id]),
    executeQuery<R>(`SELECT DECLINE_REASON AS R, COUNT(*) AS N FROM APPLICATIONS WHERE DEALER_ID = ? AND DECISION = 'DECLINED' GROUP BY 1`, [id]),
    executeQuery<R>(`SELECT c.MONTH_INDEX AS I, COUNT_IF(c.IS_FIRST_PAYMENT_DEFAULT) AS FPD, COALESCE(SUM(p.CO), 0) * 100 AS CO
      FROM CONTRACTS c LEFT JOIN (SELECT CONTRACT_ID, SUM(CHARGE_OFF_AMOUNT) AS CO FROM PAYMENTS_MONTHLY GROUP BY 1) p
        ON p.CONTRACT_ID = c.CONTRACT_ID WHERE c.DEALER_ID = ? GROUP BY 1`, [id]),
  ]);
  const row = d.rows[0];
  if (!row) return null;
  const out: Dealer = {
    id, name: String(row.DEALER_NAME), region: String(row.REGION), state: String(row.STATE), type: String(row.DEALER_TYPE),
    rm: String(row.RELATIONSHIP_MANAGER), onboarded: String(row.ONBOARDED), targetMonthlyUnits: n(row.TARGET_MONTHLY_UNITS),
    apps: zeros(), approved: zeros(), funded: zeros(), fundedCents: zeros(), usedLtvSum: zeros(), usedN: zeros(), ltvDeclines: zeros(),
    fpd: zeros(), chargeOffCents: 0, reasons: REASONS.map(() => 0), used: 0, new: 0,
  };
  for (const x of m.rows) {
    const i = n(x.I);
    out.apps[i] = n(x.APPS); out.approved[i] = n(x.APPR); out.funded[i] = n(x.FUND); out.fundedCents[i] = Math.round(n(x.CENTS));
    out.usedLtvSum[i] = n(x.ULTV); out.usedN[i] = n(x.UN); out.ltvDeclines[i] = n(x.LTVD); out.used += n(x.UN); out.new += n(x.NEWN);
  }
  for (const x of r.rows) out.reasons[REASONS.indexOf(String(x.R))] = n(x.N);
  for (const x of c.rows) { out.fpd[n(x.I)] = n(x.FPD); out.chargeOffCents += Math.round(n(x.CO)); }
  return out;
}

const QUEUE_COLS = `q.CONTRACT_ID, q.BORROWER_NAME, q.DEALER_ID, q.DEALER_NAME, q.DELINQUENCY_STATUS, q.FICO_BAND, q.LTV_PCT, q.TERM_MONTHS,
  q.MONTHS_ON_BOOK, TO_CHAR(q.FUNDED_MONTH, 'YYYY-MM') AS FUNDED_MONTH, q.AMOUNT, q.APR, q.BALANCE, q.MONTHLY_PAYMENT, q.NEW_USED, q.ROLL_RISK_SCORE`;
function toAccount(r: R, history: string[]): Account {
  return {
    id: n(r.CONTRACT_ID), borrower: String(r.BORROWER_NAME), dealerId: n(r.DEALER_ID), dealer: String(r.DEALER_NAME),
    state: String(r.DELINQUENCY_STATUS), band: String(r.FICO_BAND), ltv: n(r.LTV_PCT), term: n(r.TERM_MONTHS), mob: n(r.MONTHS_ON_BOOK),
    fundedMonth: String(r.FUNDED_MONTH), amount: n(r.AMOUNT), apr: n(r.APR), balance: n(r.BALANCE), payment: n(r.MONTHLY_PAYMENT),
    newUsed: String(r.NEW_USED), score: n(r.ROLL_RISK_SCORE), history,
  };
}
async function histories(where: string, binds: (string | number)[]): Promise<Map<number, string[]>> {
  const { rows } = await executeQuery<R>(`SELECT p.CONTRACT_ID AS ID, ARRAY_AGG(p.DELINQUENCY_STATUS) WITHIN GROUP (ORDER BY p.MONTHS_ON_BOOK) AS H
    FROM PAYMENTS_MONTHLY p WHERE p.SNAPSHOT_MONTH >= '2025-11-01' AND ${where} GROUP BY 1`, binds);
  return new Map(rows.map((r) => [n(r.ID), (typeof r.H === 'string' ? JSON.parse(r.H) : r.H) as string[]]));
}

export async function liveCollections(): Promise<Collections> {
  const top = `SELECT CONTRACT_ID FROM COLLECTIONS_QUEUE ORDER BY ROLL_RISK_SCORE DESC, BALANCE DESC, CONTRACT_ID LIMIT 400`;
  const [list, count, hist] = await Promise.all([
    executeQuery<R>(`SELECT ${QUEUE_COLS} FROM COLLECTIONS_QUEUE q ORDER BY q.ROLL_RISK_SCORE DESC, q.BALANCE DESC, q.CONTRACT_ID LIMIT 400`),
    executeQuery<R>(`SELECT COUNT(*) AS N FROM COLLECTIONS_QUEUE`),
    histories(`p.CONTRACT_ID IN (${top})`, []),
  ]);
  return { queueSize: n(count.rows[0]?.N), collectors: COLLECTORS, accounts: list.rows.map((r) => toAccount(r, hist.get(n(r.CONTRACT_ID)) ?? [])) };
}

export async function liveAccount(id: number): Promise<Account | null> {
  const [a, hist] = await Promise.all([
    executeQuery<R>(`SELECT ${QUEUE_COLS} FROM COLLECTIONS_QUEUE q WHERE q.CONTRACT_ID = ?`, [id]),
    histories('p.CONTRACT_ID = ?', [id]),
  ]);
  return a.rows[0] ? toAccount(a.rows[0], hist.get(id) ?? []) : null;
}

export async function liveActions(id: number): Promise<ActionRecord[]> {
  const { rows } = await executeQuery<R>(`SELECT CONTRACT_ID, ACTION, COLLECTOR, TO_CHAR(PROMISE_DATE, 'YYYY-MM-DD') AS PD, PROMISE_AMOUNT, NOTE,
      TO_CHAR(RECORDED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS AT FROM COLLECTION_ACTIONS WHERE CONTRACT_ID = ? ORDER BY RECORDED_AT DESC LIMIT 20`, [id]);
  return rows.map((r) => ({ contractId: n(r.CONTRACT_ID), action: String(r.ACTION) as ActionRecord['action'], collector: r.COLLECTOR ? String(r.COLLECTOR) : undefined,
    promiseDate: r.PD ? String(r.PD) : undefined, promiseAmount: r.PROMISE_AMOUNT == null ? undefined : n(r.PROMISE_AMOUNT),
    note: r.NOTE ? String(r.NOTE) : undefined, recordedAt: String(r.AT) }));
}

export { COLLECTORS };
