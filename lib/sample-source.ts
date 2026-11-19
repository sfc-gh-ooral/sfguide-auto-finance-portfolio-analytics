'use client';

// Sample mode: bundled synthetic data plus answers captured from a Live run (data/captured/).
// AI calls wait a few seconds so the staged steps read like the real call; every AI result is
// labeled "Sample AI response" in the UI. Actions are saved in this browser only.
import aggregatesJson from '@/data/aggregates.json';
import collectionsJson from '@/data/collections.json';
import askJson from '@/data/captured/ask.json';
import narrativesJson from '@/data/captured/narratives.json';
import accountSummariesJson from '@/data/captured/account-summaries.json';
import type { Account, ActionRecord, Aggregates, AskAnswer, Collections, Dealer, DealerSummary } from './types';
import type { Narrative, NewAction } from './source';
import { scoreParts, summarize } from './derive';
import { sampleDelayMs, wait } from './sample-timing';
import { BASE_PATH } from './hosted';
import { div, fmtPct, sum } from './utils';

let dealerCache: Promise<Dealer[]> | null = null;
const fetchDealers = (): Promise<Dealer[]> => fetch(`${BASE_PATH}/data/dealers.json`).then((r) => r.json());
const allDealers = () => (dealerCache ??= fetchDealers());
const coll = collectionsJson as Collections;

export async function aggregates(): Promise<Aggregates> { return aggregatesJson as unknown as Aggregates; }
export async function dealers(): Promise<DealerSummary[]> { return (await allDealers()).map(summarize); }
export async function dealer(id: number): Promise<Dealer> {
  const d = (await allDealers()).find((x) => x.id === id);
  if (!d) throw new Error(`Dealer ${id} is not in the sample data`);
  return d;
}

export async function narrative(id: number): Promise<Narrative> {
  await wait(sampleDelayMs());
  const captured = (narrativesJson as Record<string, { headline: string; bullets: string[] }>)[String(id)];
  if (captured) return { ...captured, source: 'sample' };
  // Rule-based fallback for dealers without a captured narrative, grounded in the same facts.
  const d = await dealer(id);
  const s = summarize(d);
  const up = s.declineRecent - s.declinePrior;
  const fpd = div(s.fpd2026, s.funded2026);
  return {
    source: 'sample',
    headline: Math.abs(up) < 0.03 ? `${d.name} is holding steady on approvals` : up > 0 ? `${d.name} declines are rising` : `${d.name} declines are easing`,
    bullets: [
      `Decline rate moved from ${fmtPct(s.declinePrior)} to ${fmtPct(s.declineRecent)} from May-Oct 2025 to May-Oct 2026.`,
      `First-payment defaults on contracts funded Jan-Sep 2026: ${fmtPct(fpd)} (${s.fpd2026} of ${s.funded2026}).`,
      `Review recent funded deals with ${d.rm} before the next funding cycle.`,
    ],
  };
}

const local = <T,>(key: string, fallback: T): T => { try { return JSON.parse(window.localStorage.getItem(key) ?? '') as T; } catch { return fallback; } };

export async function flagDealer(id: number, reason: string, assignedTo: string, note: string) {
  await wait(500);
  const all = local<Record<string, unknown>[]>('afpa-dealer-reviews', []);
  all.push({ id, reason, assignedTo, note, at: new Date().toISOString() });
  window.localStorage.setItem('afpa-dealer-reviews', JSON.stringify(all));
  return { savedTo: 'this browser (Sample mode)' };
}

export async function collections(): Promise<Collections> { return coll; }
export async function account(id: number): Promise<Account> {
  const a = coll.accounts.find((x) => x.id === id);
  if (!a) throw new Error(`Account ${id} is not in the sample queue (the top 400 accounts ship with Sample mode)`);
  return a;
}

export async function accountSummary(id: number): Promise<Narrative> {
  await wait(sampleDelayMs());
  const captured = (accountSummariesJson as Record<string, { headline: string; bullets: string[] }>)[String(id)];
  if (captured) return { ...captured, source: 'sample' };
  const a = await account(id);
  const top = scoreParts(a).filter((p) => p.pts).sort((x, y) => y.pts - x.pts);
  const prior = a.history.slice(0, -1).filter((s) => s !== 'Current').length;
  return {
    source: 'sample',
    headline: `${a.state === '60-89 DPD' ? 'Second missed payment' : 'First missed payment'} on a ${a.band} ${a.newUsed.toLowerCase()}-vehicle loan`,
    bullets: [
      `${a.state} with $${a.balance.toFixed(0)} outstanding; ${a.mob} months on book${prior ? `, ${prior} earlier delinquent month${prior > 1 ? 's' : ''}` : ', no earlier delinquency'}.`,
      `Largest score drivers: ${top.slice(0, 3).map((p) => p.label).join(', ')}.`,
      `Consider an early call and a promise to pay of at least $${(a.payment * (a.state === '60-89 DPD' ? 2 : 1)).toFixed(0)}.`,
    ],
  };
}

const ACT_KEY = 'afpa-collection-actions';
export async function actions(contractId: number): Promise<ActionRecord[]> {
  return local<ActionRecord[]>(ACT_KEY, []).filter((a) => a.contractId === contractId).reverse();
}
export async function recordAction(a: NewAction) {
  await wait(500);
  const all = local<ActionRecord[]>(ACT_KEY, []);
  all.push({ ...a, recordedAt: new Date().toISOString() });
  window.localStorage.setItem(ACT_KEY, JSON.stringify(all));
  return { savedTo: 'this browser (Sample mode)' };
}

const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
export async function ask(question: string): Promise<AskAnswer> {
  await wait(sampleDelayMs());
  const list = askJson as AskAnswer[];
  const exact = list.find((x) => x.question.toLowerCase() === question.trim().toLowerCase());
  if (exact) return { ...exact, source: 'sample', latencyMs: undefined };
  const w = words(question);
  const best = [...list].sort((a, b) => sum([...words(b.question)].map((t) => (w.has(t) ? 1 : 0))) - sum([...words(a.question)].map((t) => (w.has(t) ? 1 : 0))))[0];
  return { ...best, question, source: 'sample', latencyMs: undefined,
    text: `Sample mode replays answers captured from a Live run, so it answers the suggested questions. The closest one is "${best.question}":\n\n${best.text}` };
}
