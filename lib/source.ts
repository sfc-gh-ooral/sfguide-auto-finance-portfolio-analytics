'use client';

// The app's data interface. Sample mode reads bundled synthetic data (and results captured from a
// Live run); Live mode calls this app's API routes, which query Snowflake. Screens use only this.
import { useEffect, useState } from 'react';
import type { Account, ActionRecord, Aggregates, AskAnswer, Collections, Dealer, DealerSummary } from './types';
import { liveJson, useMode, type Mode } from './mode';
import * as sample from './sample-source';

export interface Narrative { headline: string; bullets: string[]; model?: string; latencyMs?: number; source: 'sample' | 'ai_complete' }
export interface Saved { savedTo: string }
export type NewAction = Omit<ActionRecord, 'recordedAt'>;

export interface DataSource {
  mode: Mode;
  aggregates(): Promise<Aggregates>;
  dealers(): Promise<DealerSummary[]>;
  dealer(id: number): Promise<Dealer>;
  narrative(id: number): Promise<Narrative>;
  flagDealer(id: number, reason: string, assignedTo: string, note: string): Promise<Saved>;
  collections(): Promise<Collections>;
  account(id: number): Promise<Account>;
  accountSummary(id: number): Promise<Narrative>;
  actions(contractId: number): Promise<ActionRecord[]>;
  recordAction(a: NewAction): Promise<Saved>;
  ask(question: string): Promise<AskAnswer>;
}

const post = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const live: DataSource = {
  mode: 'live',
  aggregates: () => liveJson('/api/overview'),
  dealers: () => liveJson('/api/dealers'),
  dealer: (id) => liveJson(`/api/dealer?id=${encodeURIComponent(id)}`),
  narrative: (id) => liveJson('/api/narrative', post({ id })),
  flagDealer: (id, reason, assignedTo, note) => liveJson('/api/dealer-review', post({ id, reason, assignedTo, note })),
  collections: () => liveJson('/api/collections'),
  account: (id) => liveJson(`/api/account?id=${encodeURIComponent(id)}`),
  accountSummary: (id) => liveJson('/api/account-summary', post({ id })),
  actions: (contractId) => liveJson(`/api/actions?id=${encodeURIComponent(contractId)}`),
  recordAction: (a) => liveJson('/api/actions', post(a)),
  ask: (question) => liveJson('/api/ask', post({ question })),
};

const sampleSource: DataSource = { mode: 'sample', ...sample };

export function useSource(): DataSource | undefined {
  const { mode } = useMode();
  if (!mode) return undefined;
  return mode === 'live' ? live : sampleSource;
}

// Loads once per source; errors in Live mode are shown, never replaced with sample data.
export function useLoad<T>(src: DataSource | undefined, fn: (s: DataSource) => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    if (!src) return;
    let alive = true;
    setState({ loading: true });
    fn(src).then((data) => alive && setState({ data, loading: false }))
      .catch((e) => alive && setState({ error: e instanceof Error ? e.message : String(e), loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src?.mode, ...deps]);
  return state;
}
