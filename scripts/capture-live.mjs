// Captures AI results from a Live run so Sample mode can replay them (always labeled in the UI as a
// sample captured from Live). Run with the dev server up in Live mode:
//   npm run dev   (with .env.local)   then   node scripts/capture-live.mjs
import { writeFileSync } from 'node:fs';

const BASE = process.env.APP_URL ?? 'http://localhost:3000';
const get = async (p) => { const r = await fetch(BASE + p); const j = await r.json(); if (!r.ok || j.error) throw new Error(`${p}: ${j.error}`); return j; };
const post = async (p, body) => {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok || j.error) throw new Error(`${p}: ${j.error}`); return j;
};
const save = (f, v) => { writeFileSync(`data/captured/${f}`, JSON.stringify(v, null, 1)); console.log('wrote', f); };

if ((await get('/api/mode')).mode !== 'live') throw new Error('The server has no Snowflake connection (.env.local).');

// Keep in sync with lib/questions.ts
const questions = [
  'What is the 30+ DPD rate by FICO band last month?',
  'Show the 30+ DPD rate by month for the 580-619 FICO band',
  'What are total charge-offs by vintage quarter?',
  'Which dealers have the highest first-payment default rate in 2026?',
  'What is the monthly decline rate for Sunbelt Motors Group?',
  'How does look-to-book compare on weekends versus weekdays?',
  'What is the average APR on funded contracts by loan term?',
];
const ask = [];
for (const q of questions) {
  const t0 = Date.now();
  const a = await post('/api/ask', { question: q });
  console.log(`ask ${((Date.now() - t0) / 1000).toFixed(1)}s verified=${a.verifiedQueryUsed} rows=${a.result?.rows.length ?? 0} · ${q}`);
  delete a.latencyMs;
  ask.push({ ...a, source: 'sample' });
}
save('ask.json', ask);

// Dealer narratives: the two planted dealer stories plus the top three by funded volume.
const dealers = await get('/api/dealers');
const picks = [7, 23, ...[...dealers].sort((a, b) => b.fundedCents - a.fundedCents).slice(0, 3).map((d) => d.id)];
const narratives = {};
for (const id of [...new Set(picks)]) {
  const n = await post('/api/narrative', { id });
  narratives[id] = { headline: n.headline, bullets: n.bullets };
  console.log('narrative', id, n.headline);
}
save('narratives.json', narratives);

// Account summaries for the top of the collections queue.
const { accounts } = await get('/api/collections');
const summaries = {};
for (const a of accounts.slice(0, 8)) {
  const n = await post('/api/account-summary', { id: a.id });
  summaries[a.id] = { headline: n.headline, bullets: n.bullets };
  console.log('account', a.id, n.headline);
}
save('account-summaries.json', summaries);
