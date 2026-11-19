// Shapes shared by Sample mode (bundled JSON) and Live mode (API routes over Snowflake).
// Live routes return exactly these shapes, so every screen renders the same way in both modes.

export interface MonthRow {
  month: string; apps: number; approved: number; funded: number; fundedCents: number; minutesSum: number; aprBpsSum: number;
  chargeOffCents: number; activeBalanceCents: number; active: number; dpd30: number; // month-end portfolio
}
export interface BandRow { band: string; apps: number[]; approved: number[]; funded: number[]; aprBpsSum: number[]; dpd30: number[]; active: number[]; minutesSum: number }
export interface DowRow { dow: string; apps: number; approved: number; funded: number }
export interface RegionRow { region: string; apps: number[]; funded: number[]; fundedCents: number[] }
export interface ChannelRow { apps: number; approved: number; funded: number; minutesSum: number }
export interface NewUsedRow { type: string; apps: number; funded: number; fundedCents: number; ltvSum: number }
export interface CurveRow { fundedCents: number; chargeOffCents: number[] } // charge-offs by month on book (index = MOB)

export interface Aggregates {
  months: string[];
  bands: string[];
  regions: string[];
  reasons: string[];
  channels: string[];
  states: string[];        // Current, 30-59 DPD, 60-89 DPD, 90+ DPD, Charged off
  terms: number[];
  ltvBuckets: string[];
  monthly: MonthRow[];
  band: BandRow[];
  dow: DowRow[];
  region: RegionRow[];
  channel: ChannelRow[];
  newUsed: NewUsedRow[];
  termFunded: number[][];  // [term][month]
  ltvFunded: number[][];   // [bucket][month]
  reasonTotals: number[];
  vintage: (CurveRow & { quarter: number })[];
  segment: (CurveRow & { label: string })[];
  roll: { lastMonth: number[][]; sixMonths: number[][] }; // [from 0-3][to 0-4]
  queueSize: number;
}

export interface Dealer {
  id: number; name: string; region: string; state: string; type: string; rm: string; onboarded: string;
  targetMonthlyUnits: number;
  apps: number[]; approved: number[]; funded: number[]; fundedCents: number[];
  usedLtvSum: number[]; usedN: number[]; ltvDeclines: number[];
  fpd: number[];           // first-payment defaults by funded month
  chargeOffCents: number;
  reasons: number[]; used: number; new: number;
}

export interface DealerSummary {
  id: number; name: string; region: string; state: string; type: string; rm: string;
  apps: number; approved: number; funded: number; fundedCents: number;
  declineRecent: number; declinePrior: number; // May-Oct 2026 vs May-Oct 2025
  fpd2026: number; funded2026: number;          // contracts funded Jan-Sep 2026
}

export interface Account {
  id: number; borrower: string; dealerId: number; dealer: string; state: string; band: string;
  ltv: number; term: number; mob: number; fundedMonth: string; amount: number; apr: number;
  balance: number; payment: number; newUsed: string; score: number;
  history: string[]; // month-end status, oldest first, up to the last 12 months
}
export interface Collections { queueSize: number; collectors: string[]; accounts: Account[] }

export interface ActionRecord {
  contractId: number; action: 'ASSIGN' | 'PROMISE'; collector?: string; promiseDate?: string; promiseAmount?: number; note?: string;
  recordedAt: string;
}

export interface ResultTable { columns: string[]; rows: (string | number | null)[][] }

export interface AskAnswer {
  question: string;
  text: string;
  sql?: string;
  verifiedQueryUsed?: boolean;
  result?: ResultTable;
  latencyMs?: number;
  source: 'sample' | 'cortex-agent';
}
