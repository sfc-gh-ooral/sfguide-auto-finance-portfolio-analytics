import { NextResponse } from 'next/server';
import { isSnowflakeConfigured, liveError, notConfigured } from '@/lib/snowflake';
import { liveCollections } from '@/lib/live-queries';

// Collections work queue: the 400 highest roll-risk accounts from COLLECTIONS_QUEUE.
export async function GET() {
  if (!isSnowflakeConfigured()) return notConfigured();
  try { return NextResponse.json(await liveCollections()); } catch (e) { return liveError(e); }
}
