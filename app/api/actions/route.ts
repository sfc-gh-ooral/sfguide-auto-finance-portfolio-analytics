import { NextResponse } from 'next/server';
import { executeQuery, isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { COLLECTORS, liveActions } from '@/lib/live-queries';

// Collector assignments and promises to pay, recorded in COLLECTION_ACTIONS. Nothing is sent to the
// borrower; this only records the collector's decision.
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id < 0) return liveError('id must be a contract number', 400);
  if (!isSnowflakeConfigured()) return notConfigured();
  try { return NextResponse.json(await liveActions(id)); } catch (e) { return liveError(e); }
}

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  const id = b.contractId;
  if (!Number.isInteger(id) || id < 0) return liveError('contractId must be a contract number', 400);
  if (b.action !== 'ASSIGN' && b.action !== 'PROMISE') return liveError('action must be ASSIGN or PROMISE', 400);
  if (b.collector != null && !COLLECTORS.includes(b.collector)) return liveError('unknown collector', 400);
  if (b.action === 'PROMISE') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.promiseDate ?? ''))) return liveError('promiseDate must be YYYY-MM-DD', 400);
    if (!(Number(b.promiseAmount) > 0 && Number(b.promiseAmount) < 1e6)) return liveError('promiseAmount must be a positive amount', 400);
  }
  const note = String(b.note ?? '').slice(0, 500);
  if (!isSnowflakeConfigured()) return notConfigured();
  try {
    await executeQuery(
      `INSERT INTO COLLECTION_ACTIONS (CONTRACT_ID, ACTION, COLLECTOR, PROMISE_DATE, PROMISE_AMOUNT, NOTE, RECORDED_BY)
       SELECT ?, ?, ?, TRY_TO_DATE(?), ?, ?, CURRENT_USER()`,
      [id, b.action, b.collector ?? null, b.action === 'PROMISE' ? b.promiseDate : null, b.action === 'PROMISE' ? Number(b.promiseAmount) : null, note]);
    return NextResponse.json({ savedTo: 'AUTO_FINANCE_EXAMPLE.LENDING.COLLECTION_ACTIONS' });
  } catch (e) { return liveError(e); }
}
