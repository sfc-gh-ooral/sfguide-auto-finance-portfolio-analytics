import { NextResponse } from 'next/server';
import { executeQuery, isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { REVIEW_REASONS } from '@/lib/derive';

// Records a dealer review in DEALER_REVIEWS. The review is a flag for people; nothing changes in
// dealer setup or credit policy.
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  if (!Number.isInteger(b.id) || b.id < 1) return liveError('id must be a dealer number', 400);
  if (!REVIEW_REASONS.includes(b.reason)) return liveError('unknown review reason', 400);
  const assignedTo = String(b.assignedTo ?? '').slice(0, 100);
  const note = String(b.note ?? '').slice(0, 500);
  if (!isSnowflakeConfigured()) return notConfigured();
  try {
    await executeQuery(
      `INSERT INTO DEALER_REVIEWS (DEALER_ID, REASON, ASSIGNED_TO, NOTE, RECORDED_BY) SELECT ?, ?, ?, ?, CURRENT_USER()`,
      [b.id, b.reason, assignedTo, note]);
    return NextResponse.json({ savedTo: 'AUTO_FINANCE_EXAMPLE.LENDING.DEALER_REVIEWS' });
  } catch (e) { return liveError(e); }
}
