// Seeded, deterministic synthetic data for the Auto Finance Portfolio Analytics example.
//
// The 1.2M applications and 4.6M monthly payment snapshots are too large to ship, so sql/setup.sql
// generates them in Snowflake with the same integer hash used here (H below). This script runs that
// hash in JS, writes the aggregates the Sample-mode app needs, and writes the 1,500 dealers into
// sql/setup.sql between the GENERATED markers. Same input, same numbers, every run.
//
//   npm run generate
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

// ---------------------------------------------------------------- hash (mirrors HASH32 in setup.sql)
// x = (n * 2654435761 + s * 97531 + 12345) mod 2^32
// x = ((x xor (x >> 15)) * 2246822519) mod 2^32
// x =  x xor (x >> 13)
function H(n, s) {
  let x = ((Math.imul(n, 2654435761 | 0) >>> 0) + s * 97531 + 12345) % 4294967296;
  x = Math.imul((x ^ (x >>> 15)) >>> 0, 2246822519 | 0) >>> 0;
  return (x ^ (x >>> 13)) >>> 0;
}
const U = (n, s) => H(n, s) % 10000; // 0..9999

// ---------------------------------------------------------------- constants (keep in sync with setup.sql)
const N_APPS = 1_200_000;
const N_DEALERS = 1500;
const SUNBELT_ID = 7;      // story: LTV-driven declines
const FPD_ID = 23;         // story: first-payment-default cluster
const FPD_NAME = 'Harbor Pre-Owned';
const START = Date.UTC(2024, 10, 1); // 2024-11-01; 730 days → 2026-10-31, 24 full months
const MONTHS = Array.from({ length: 24 }, (_, i) => new Date(Date.UTC(2024, 10 + i, 1)).toISOString().slice(0, 7));
const BANDS = ['<580', '580-619', '620-679', '680-739', '740+'];
const APPROVE_BASE = [3200, 5200, 7000, 8300, 9100];
const APR_BASE = [1890, 1390, 990, 690, 549];
const DQ_BASE = [5200, 3200, 1900, 950, 380];     // lifetime chance (per 10,000) a contract goes 30+ DPD
const REASONS = ['Credit score', 'Debt-to-income', 'Income verification', 'Vehicle valuation', 'Stipulations not met', 'LTV above policy'];
const REGIONS = ['Southeast', 'Southwest', 'Midwest', 'Northeast', 'West'];
const STATES = {
  Southeast: ['FL', 'GA', 'NC', 'SC', 'TN', 'AL'], Southwest: ['TX', 'AZ', 'NM', 'OK', 'NV'],
  Midwest: ['OH', 'IL', 'MI', 'IN', 'MO', 'WI'], Northeast: ['PA', 'NY', 'NJ', 'MA', 'CT'], West: ['CA', 'WA', 'OR', 'CO', 'UT'],
};
const TERMS = [36, 48, 60, 72, 84];
// Delinquency states: 0 Current, 1 30-59 DPD, 2 60-89 DPD, 3 90+ DPD, 4 Charged off
export const STATE_NAMES = ['Current', '30-59 DPD', '60-89 DPD', '90+ DPD', 'Charged off'];
const PATHS = [null, [1], [1, 2], [1, 2, 3, 3], [1, 2, 3, 3, 4]]; // by outcome; after the path: current (1-3) or closed (4)
const FIRST = ['James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia', 'David', 'Jennifer', 'Carlos', 'Elizabeth', 'Daniel', 'Aisha',
  'Kevin', 'Sandra', 'Brian', 'Nicole', 'Anthony', 'Angela', 'Marcus', 'Melissa', 'Jose', 'Rebecca', 'Tyler', 'Laura', 'Andre', 'Kimberly',
  'Steven', 'Monica', 'Eric', 'Rachel', 'Luis', 'Tanya', 'Jason', 'Denise', 'Omar', 'Heather', 'Victor', 'Crystal', 'Derek', 'Yolanda'];
const LAST = ['Johnson', 'Garcia', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell'];
const COLLECTORS = ['Alicia Grant', 'Devon Price', 'Mei Lin', 'Rafael Soto', 'Tara Quinn', 'Will Hammond'];

const fico = (n) => { const u = U(n, 9); return u < 800 ? 0 : u < 2200 ? 1 : u < 4800 ? 2 : u < 7600 ? 3 : 4; };

// ---------------------------------------------------------------- dealers
const PLACES = ['Riverside', 'Lakeshore', 'Summit', 'Pine Valley', 'Harbor', 'Mesa', 'Cedar Ridge', 'Prairie', 'Bayview', 'Northgate',
  'Silver Creek', 'Oak Hollow', 'Redstone', 'Canyon', 'Bluewater', 'Highland', 'Maple Grove', 'Stonebridge', 'Westfield', 'Eastport',
  'Granite', 'Willow Bend', 'Sunrise', 'Iron Hill', 'Copper Mountain', 'Fairview', 'Brookside', 'Kingsley', 'Red Oak', 'Clearwater',
  'Twin Pines', 'Crescent', 'Meadowlark', 'Hillcrest', 'Southpoint', 'Gateway', 'Liberty', 'Heritage', 'Pioneer', 'Frontier',
  'Coastal', 'Valley View', 'Ridgeline', 'Lone Star', 'Magnolia', 'Palmetto', 'Great Lakes', 'Keystone', 'Evergreen', 'Desert Sky',
  'Bluegrass', 'Tidewater', 'Cardinal', 'Junction', 'Mill Creek', 'Parkside', 'Springdale', 'Foxhill', 'Thornton', 'Ashford'];
const ADJ = ['North', 'South', 'East', 'West', 'Central', 'Metro', 'Premier', 'Select', 'Prime', 'United', 'First', 'Allied'];
const SUFFIX = ['Motors', 'Auto Group', 'Automotive', 'Car Center', 'Auto Sales', 'Motor Co.', 'Auto Mall', 'Pre-Owned'];
const RMS = ['Dana Whitfield', 'Marcus Lee', 'Priya Raman', 'Tom Okafor', 'Elena Brooks', 'Jordan Pike', 'Grace Huang', 'Luis Ortega',
  'Hannah Cole', 'Sam Adeyemi', 'Rita Novak', 'Ben Castillo'];
const FIXED = { [SUNBELT_ID]: ['Sunbelt Motors Group', 'Southeast', 'GA'], [FPD_ID]: [FPD_NAME, 'Southwest', 'TX'] };

function buildDealers() {
  const seen = new Set(Object.values(FIXED).map((f) => f[0]));
  const dealers = [];
  for (let id = 1; id <= N_DEALERS; id++) {
    let name = FIXED[id]?.[0];
    if (!name) {
      for (let s = 0; ; s++) {
        const base = `${PLACES[H(id * 7 + s, 31) % PLACES.length]} ${SUFFIX[H(id * 7 + s, 32) % SUFFIX.length]}`;
        name = s === 0 ? base : `${ADJ[H(id * 7 + s, 33) % ADJ.length]} ${base}`;
        if (!seen.has(name)) break;
      }
      seen.add(name);
    }
    const region = FIXED[id]?.[1] ?? REGIONS[H(id, 30) % 5];
    const st = STATES[region];
    dealers.push({
      id, name, region, state: FIXED[id]?.[2] ?? st[H(id, 34) % st.length],
      type: id === FPD_ID ? 'Independent' : H(id, 35) % 10 < 6 ? 'Franchise' : 'Independent',
      rm: RMS[H(id, 36) % RMS.length],
      onboarded: new Date(Date.UTC(2012 + (H(id, 37) % 12), H(id, 38) % 12, 1)).toISOString().slice(0, 10),
    });
  }
  return dealers;
}

// ---------------------------------------------------------------- delinquency path (mirrors CONTRACT_RISK in setup.sql)
// Each funded contract draws once whether it ever goes 30+ DPD, the month on book when it first does,
// and how far it rolls: cure after 30, cure after 60, cure after 90+, or charge off at month 5 of the episode.
export function riskOf(n, fm, fb, used, term, ltv, dealer) {
  const weak = used && term === 84 && fm >= 3 && fm <= 5;          // story: weak vintage
  const fpdDealer = dealer === FPD_ID && fm >= 14;                  // story: FPD cluster
  let p = DQ_BASE[fb];
  if (weak) p += DQ_BASE[fb] + 600;
  if (fpdDealer) p += 1600;
  if (ltv > 120) p += 300;
  // Story: subprime creep. Extra 580-619 episodes that begin in recent calendar months, skewed later.
  const calStart = 12 + Math.max(H(n, 28) % 12, H(n, 29) % 12);
  const creep = fb === 1 && calStart > fm && U(n, 30) < 2200;
  const dq = creep || U(n, 21) < p;
  const start = creep ? calStart - fm
    : fpdDealer && U(n, 25) < 7000 ? 1 : 1 + Math.min(H(n, 22) % 18, H(n, 23) % 18);
  const u = U(n, 24);
  const outcome = u < (weak ? 3000 : 5000) ? 1 : u < (weak ? 4500 : 7000) ? 2 : u < (weak ? 5000 : 7500) ? 3 : 4;
  return { dq, start, outcome: dq ? outcome : 0, weak };
}
// State at month on book k (1-based), or -1 once the contract has charged off and closed.
export function stateAt(r, k) {
  if (!r.dq || k < r.start) return 0;
  const path = PATHS[r.outcome], j = k - r.start;
  if (j < path.length) return path[j];
  return r.outcome === 4 ? -1 : 0;
}
// Roll-risk score for the collections queue (mirrors COLLECTIONS_QUEUE in setup.sql). Transparent points, 0 to 91.
export function rollScore(state, fb, ltv, term, mob) {
  return (state === 2 ? 45 : 25) + [20, 16, 10, 5, 2][fb] + (ltv > 120 ? 10 : ltv > 110 ? 5 : 0)
    + (term >= 84 ? 8 : term >= 72 ? 4 : 0) + (mob <= 6 ? 8 : 0);
}

// ---------------------------------------------------------------- applications → aggregates
function run() {
  const dealers = buildDealers();
  const D = N_DEALERS + 1;
  const z = (len) => new Float64Array(len);
  const dApps = z(D * 24), dAppr = z(D * 24), dFund = z(D * 24), dFundC = z(D * 24), dUsedLtv = z(D * 24), dUsedN = z(D * 24),
    dLtvDecl = z(D * 24), dFpd = z(D * 24), dCoC = z(D);
  const dReason = z(D * 6), dUsed = z(D), dNew = z(D);
  const mApps = z(24), mAppr = z(24), mFund = z(24), mFundC = z(24), mMin = z(24), mAprBps = z(24);
  const mCoC = z(24), mBalC = z(24), mActive = z(24), mDpd = z(24);
  const bApps = z(5 * 24), bAppr = z(5 * 24), bFund = z(5 * 24), bAprBps = z(5 * 24), bDpd = z(5 * 24), bActive = z(5 * 24);
  const dowAppr = z(7), dowFund = z(7), dowApps = z(7);
  const rFund = z(5 * 24), rFundC = z(5 * 24), rApps = z(5 * 24);
  const chApps = z(3), chAppr = z(3), chFund = z(3), chMin = z(3);
  const nuApps = z(2), nuFund = z(2), nuFundC = z(2), nuLtv = z(2);
  const tFund = z(5 * 24), lFund = z(3 * 24);
  const reasons = z(6), bandMin = z(5);
  const vFundC = z(8), vCoC = z(8 * 24);               // vintage quarter × month on book
  const sFundC = z(2), sCoC = z(2 * 24);               // used 84-month: [weak Feb-Apr 2025, other 2025 H1 used 84-month]
  const roll = z(4 * 5), roll6 = z(4 * 5);             // from state 0-3 → to state 0-4
  const queue = [];
  const dealerRegion = new Int8Array(D);
  for (const d of dealers) dealerRegion[d.id] = REGIONS.indexOf(d.region);

  for (let n = 0; n < N_APPS; n++) {
    const d1 = H(n, 1) % 730, d2 = H(n, 2) % 730;
    const day = U(n, 3) < 3500 ? Math.max(d1, d2) : d1;
    const date = new Date(START + day * 86400000);
    const cm = (date.getUTCFullYear() - 2024) * 12 + date.getUTCMonth() - 10;
    const dow = date.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    let dealer;
    if (U(n, 4) < 40) dealer = SUNBELT_ID;
    else { const a = H(n, 5) % 1500, b = H(n, 6) % 1500; dealer = (U(n, 7) < 5000 ? Math.min(a, b) : a) + 1; }
    const uc = U(n, 8); const ch = uc < 7800 ? 0 : uc < 9200 ? 1 : 2;
    const fb = fico(n);
    const sunbelt = dealer === SUNBELT_ID;
    const used = U(n, 10) < (sunbelt ? 7000 : 5800);
    const price = used ? 1400000 + (H(n, 11) % 2400001) : 3200000 + (H(n, 11) % 2800001);
    let ltv = used ? 80 + (H(n, 12) % 55) : 70 + (H(n, 12) % 50);
    if (sunbelt && used && cm >= 12) ltv += (cm - 11) * 3;
    const ut = U(n, 13); const ti = ut < 1000 ? 0 : ut < 2400 ? 1 : ut < 5200 ? 2 : ut < 8600 ? 3 : 4;
    const term = TERMS[ti];
    const approved = U(n, 14) < APPROVE_BASE[fb] - (ltv > 120 ? 2600 : ltv > 110 ? 900 : 0);
    let reason = -1;
    if (!approved) {
      if (ltv > 120 && U(n, 15) < 7000) reason = 5;
      else { const ur = U(n, 16); reason = ur < 3400 ? 0 : ur < 5800 ? 1 : ur < 7400 ? 2 : ur < 8700 ? 3 : 4; }
    }
    const minutes = fb === 4 ? 2 + (H(n, 17) % 12) : 4 + (H(n, 17) % 46);
    const funded = approved && U(n, 18) < (weekend ? 4100 : 6300);
    const amount = Math.floor((price * ltv) / 100);
    const apr = APR_BASE[fb] + (H(n, 19) % 220);

    const di = dealer * 24 + cm, bi = fb * 24 + cm, ri = dealerRegion[dealer] * 24 + cm;
    dApps[di]++; mApps[cm]++; bApps[bi]++; dowApps[dow]++; rApps[ri]++; chApps[ch]++; nuApps[used ? 1 : 0]++;
    mMin[cm] += minutes; chMin[ch] += minutes; bandMin[fb] += minutes;
    if (used) { dUsedLtv[di] += ltv; dUsedN[di]++; dUsed[dealer]++; } else dNew[dealer]++;
    nuLtv[used ? 1 : 0] += ltv;
    if (approved) { dAppr[di]++; mAppr[cm]++; bAppr[bi]++; dowAppr[dow]++; chAppr[ch]++; }
    else { dReason[dealer * 6 + reason]++; reasons[reason]++; if (reason === 5) dLtvDecl[di]++; }
    if (!funded) continue;

    dFund[di]++; dFundC[di] += amount; mFund[cm]++; mFundC[cm] += amount; mAprBps[cm] += apr;
    bFund[bi]++; bAprBps[bi] += apr; dowFund[dow]++; rFund[ri]++; rFundC[ri] += amount; chFund[ch]++;
    nuFund[used ? 1 : 0]++; nuFundC[used ? 1 : 0] += amount;
    tFund[ti * 24 + cm]++; lFund[(ltv > 120 ? 2 : ltv > 100 ? 1 : 0) * 24 + cm]++;

    const r = riskOf(n, cm, fb, used, term, ltv, dealer);
    const vq = Math.floor(cm / 3);
    vFundC[vq] += amount;
    const seg = used && term === 84 && cm <= 8 ? (r.weak ? 0 : 1) : -1;
    if (seg >= 0) sFundC[seg] += amount;
    if (r.dq && r.start === 1 && cm <= 22) dFpd[di]++;
    let prev = 0;
    for (let k = 1; cm + k <= 23; k++) {
      const st = stateAt(r, k);
      if (st < 0) break;
      const m = cm + k;
      const bal = Math.max(0, Math.round((amount * (term - k)) / term)); // cents; exact integer math, same as SQL
      if (k > 1 && m === 23) roll[prev * 5 + st]++;
      if (k > 1 && m >= 18) roll6[prev * 5 + st]++;
      if (st === 4) {
        mCoC[m] += bal; dCoC[dealer] += bal; vCoC[vq * 24 + k] += bal;
        if (seg >= 0) sCoC[seg * 24 + k] += bal;
        break;
      }
      mActive[m]++; mBalC[m] += bal; bActive[fb * 24 + m]++;
      if (st >= 1) { mDpd[m]++; bDpd[fb * 24 + m]++; }
      if (m === 23 && (st === 1 || st === 2)) {
        queue.push({ n, k, st, fb, ltv, term, amount, apr, dealer, cm, used, bal, score: rollScore(st, fb, ltv, term, k), r });
      }
      prev = st;
    }
  }

  const arr = (a, from, len) => Array.from(a.subarray(from, from + len));
  const agg = {
    generated: 'scripts/generate-data.mjs (deterministic; matches sql/setup.sql)',
    months: MONTHS, bands: BANDS, regions: REGIONS, reasons: REASONS, states: STATE_NAMES,
    channels: ['Dealer portal', 'Partner marketplace', 'Direct'], terms: TERMS, ltvBuckets: ['100% or less', '101-120%', 'Above 120%'],
    monthly: MONTHS.map((m, i) => ({ month: m, apps: mApps[i], approved: mAppr[i], funded: mFund[i], fundedCents: mFundC[i],
      minutesSum: mMin[i], aprBpsSum: mAprBps[i], chargeOffCents: mCoC[i], activeBalanceCents: mBalC[i], active: mActive[i], dpd30: mDpd[i] })),
    band: BANDS.map((b, k) => ({ band: b, apps: arr(bApps, k * 24, 24), approved: arr(bAppr, k * 24, 24), funded: arr(bFund, k * 24, 24),
      aprBpsSum: arr(bAprBps, k * 24, 24), dpd30: arr(bDpd, k * 24, 24), active: arr(bActive, k * 24, 24), minutesSum: bandMin[k] })),
    dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => ({ dow: d, apps: dowApps[i], approved: dowAppr[i], funded: dowFund[i] })),
    region: REGIONS.map((r, k) => ({ region: r, apps: arr(rApps, k * 24, 24), funded: arr(rFund, k * 24, 24), fundedCents: arr(rFundC, k * 24, 24) })),
    channel: [0, 1, 2].map((i) => ({ apps: chApps[i], approved: chAppr[i], funded: chFund[i], minutesSum: chMin[i] })),
    newUsed: ['New', 'Used'].map((t, i) => ({ type: t, apps: nuApps[i], funded: nuFund[i], fundedCents: nuFundC[i], ltvSum: nuLtv[i] })),
    termFunded: TERMS.map((t, i) => arr(tFund, i * 24, 24)),
    ltvFunded: [0, 1, 2].map((i) => arr(lFund, i * 24, 24)),
    reasonTotals: Array.from(reasons),
    vintage: Array.from({ length: 8 }, (_, q) => ({ quarter: q, fundedCents: vFundC[q], chargeOffCents: arr(vCoC, q * 24, 24) })),
    segment: ['Used 84-month, booked Feb-Apr 2025', 'Other used 84-month, booked Nov 2024-Jul 2025'].map((label, i) => ({
      label, fundedCents: sFundC[i], chargeOffCents: arr(sCoC, i * 24, 24) })),
    roll: { lastMonth: [0, 1, 2, 3].map((f) => arr(roll, f * 5, 5)), sixMonths: [0, 1, 2, 3].map((f) => arr(roll6, f * 5, 5)) },
    queueSize: queue.length,
  };

  const dealerOut = dealers.map((d) => {
    const o = d.id * 24;
    const funded = arr(dFund, o, 24);
    return {
      ...d,
      targetMonthlyUnits: Math.max(1, Math.round((funded.reduce((s, v) => s + v, 0) / 24) * 1.1)),
      apps: arr(dApps, o, 24), approved: arr(dAppr, o, 24), funded, fundedCents: arr(dFundC, o, 24),
      usedLtvSum: arr(dUsedLtv, o, 24), usedN: arr(dUsedN, o, 24), ltvDeclines: arr(dLtvDecl, o, 24),
      fpd: arr(dFpd, o, 24), chargeOffCents: dCoC[d.id],
      reasons: arr(dReason, d.id * 6, 6), used: dUsed[d.id], new: dNew[d.id],
    };
  });

  // Collections queue: highest roll-risk first, then larger balance, then id.
  queue.sort((a, b) => b.score - a.score || b.bal - a.bal || a.n - b.n);
  const dealerName = new Map(dealers.map((d) => [d.id, d.name]));
  const accounts = queue.slice(0, 400).map((q) => ({
    id: q.n, borrower: `${FIRST[H(q.n, 26) % FIRST.length]} ${LAST[H(q.n, 27) % LAST.length]}`,
    dealerId: q.dealer, dealer: dealerName.get(q.dealer), state: STATE_NAMES[q.st], band: BANDS[q.fb], ltv: q.ltv, term: q.term,
    mob: q.k, fundedMonth: MONTHS[q.cm], amount: q.amount / 100, apr: q.apr / 100, balance: q.bal / 100,
    payment: Math.round(q.amount / q.term) / 100, newUsed: q.used ? 'Used' : 'New', score: q.score,
    history: Array.from({ length: Math.min(12, q.k) }, (_, i) => STATE_NAMES[stateAt(q.r, q.k - Math.min(12, q.k) + 1 + i)]),
  }));

  writeFileSync('data/aggregates.json', JSON.stringify(agg));
  mkdirSync('public/data', { recursive: true });
  writeFileSync('public/data/dealers.json', JSON.stringify(dealerOut));
  writeFileSync('data/collections.json', JSON.stringify({ queueSize: queue.length, collectors: COLLECTORS, accounts }));
  injectSql(dealerOut);
  const s = agg.monthly.reduce((a, m) => ({ apps: a.apps + m.apps, funded: a.funded + m.funded, co: a.co + m.chargeOffCents }), { apps: 0, funded: 0, co: 0 });
  console.log(`apps=${s.apps} funded=${s.funded} chargeOffs=$${(s.co / 100).toFixed(2)} queue=${queue.length} dealers=${dealerOut.length}`);
}

// ---------------------------------------------------------------- write dealer rows into setup.sql
function injectSql(dealers) {
  const path = 'sql/setup.sql';
  if (!existsSync(path)) return;
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const rows = dealers.map((d) => `  (${d.id}, ${q(d.name)}, ${q(d.region)}, ${q(d.state)}, ${q(d.type)}, ${q(d.rm)}, ${q(d.onboarded)}, ${d.targetMonthlyUnits})`).join(',\n');
  let sql = readFileSync(path, 'utf8');
  const re = /(-- BEGIN GENERATED DEALERS\n)[\s\S]*?(-- END GENERATED DEALERS)/;
  if (!re.test(sql)) throw new Error('marker DEALERS missing in setup.sql');
  sql = sql.replace(re, (_, a, b) => `${a}${rows}\n${b}`);
  writeFileSync(path, sql);
}

run();
